<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { AgentConfig, AgentFileEntry } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto('/connect');
	});

	const agentId = $derived(page.params.id as string);
	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const agent = $derived(agents.find((a) => a.id === agentId));

	let allFiles = $state<AgentFileEntry[]>([]);
	let memoryFiles = $state<AgentFileEntry[]>([]);
	let activeFile = $state<string | null>(null);
	let fileContent = $state('');
	let originalContent = $state('');
	let loading = $state(false);
	let loadingFiles = $state(false);
	let saving = $state(false);
	let fileError = $state<string | null>(null);
	let saveSuccess = $state(false);
	let initialized = $state(false);

	// Load memory files on mount
	$effect(() => {
		if (connection.isConnected && agentId && !initialized) {
			initialized = true;
			loadMemoryFiles();
		}
	});

	// Load file content when active file changes
	$effect(() => {
		if (activeFile && agentId && connection.isConnected) {
			loadFile(activeFile);
		}
	});

	function isMemoryFile(f: AgentFileEntry): boolean {
		return (
			f.name === 'MEMORY.md' ||
			f.name.startsWith('memory/') ||
			f.path.includes('/memory/')
		);
	}

	async function loadMemoryFiles() {
		loadingFiles = true;
		try {
			const tools = connection.getToolsClient();
			allFiles = await tools.listAllFiles(agentId);
			// Filter to only memory-related files that exist
			memoryFiles = allFiles.filter((f) => !f.missing && isMemoryFile(f));

			// Auto-select MEMORY.md or the most recent daily file
			if (memoryFiles.length > 0) {
				const memoryMd = memoryFiles.find((f) => f.name === 'MEMORY.md');
				activeFile = memoryMd?.name ?? memoryFiles[0].name;
			}
		} catch (err) {
			console.error('Failed to list memory files:', err);
		} finally {
			loadingFiles = false;
		}
	}

	async function loadFile(fileName: string) {
		loading = true;
		fileError = null;
		fileContent = '';
		originalContent = '';

		try {
			const tools = connection.getToolsClient();
			const content = await tools.readFile(agentId, fileName);
			fileContent = content;
			originalContent = content;
		} catch (err) {
			fileError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function saveFile() {
		if (!activeFile) return;
		saving = true;
		fileError = null;
		saveSuccess = false;

		try {
			const tools = connection.getToolsClient();
			await tools.setFile(agentId, activeFile, fileContent);
			originalContent = fileContent;
			saveSuccess = true;
			setTimeout(() => (saveSuccess = false), 3000);
		} catch (err) {
			fileError = err instanceof Error ? err.message : 'Failed to save file';
		} finally {
			saving = false;
		}
	}

	function getDisplayName(file: AgentFileEntry): string {
		if (file.name === 'MEMORY.md') return 'MEMORY.md';
		// For memory/2025-02-09.md style files, show the basename
		const parts = file.name.split('/');
		return parts[parts.length - 1];
	}

	function isLongTermMemory(file: AgentFileEntry): boolean {
		return file.name === 'MEMORY.md';
	}

	const hasChanges = $derived(fileContent !== originalContent);
</script>

<div class="flex h-dvh overflow-hidden">
	<!-- Sidebar: file list -->
	<div class="flex w-64 shrink-0 flex-col border-r border-border bg-bg-raised">
		<div class="border-b border-border px-4 py-4">
			<div class="mb-3 flex items-center gap-2 text-sm text-text-dim">
				<a href="/agents" class="transition-colors hover:text-text">Agents</a>
				<span>/</span>
				<a href="/agents/{agentId}" class="transition-colors hover:text-text">{agent?.identity?.name ?? agentId}</a>
			</div>

			<!-- Navigation tabs -->
			<div class="flex gap-1 rounded-lg border border-border bg-bg p-1">
				<a
					href="/agents/{agentId}"
					class="rounded-md px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
				>
					Config
				</a>
				<a
					href="/agents/{agentId}/workspace"
					class="rounded-md px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
				>
					Files
				</a>
				<a
					href="/agents/{agentId}/memory"
					class="rounded-md bg-bg-hover px-3 py-1.5 text-xs font-medium text-text"
				>
					Memory
				</a>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto px-2 py-2">
			{#if loadingFiles}
				<div class="p-4 text-center text-xs text-text-dim">Loading memory files...</div>
			{:else if memoryFiles.length === 0}
				<div class="p-4 text-center text-xs text-text-dim">No memory files found</div>
			{:else}
				<div class="space-y-0.5">
					{#each memoryFiles as file}
						<button
							onclick={() => (activeFile = file.name)}
							class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors"
							class:bg-accent-muted={activeFile === file.name}
							class:text-accent={activeFile === file.name}
							class:text-text-muted={activeFile !== file.name}
							class:hover:bg-bg-hover={activeFile !== file.name}
						>
							{#if isLongTermMemory(file)}
								<svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
								</svg>
								<span class="font-medium">MEMORY.md</span>
							{:else}
								<svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
								</svg>
								<span class="font-mono">{getDisplayName(file)}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="border-t border-border p-3">
			<button
				onclick={loadMemoryFiles}
				class="w-full rounded-md border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
			>
				Refresh Files
			</button>
		</div>
	</div>

	<!-- Editor area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		{#if !activeFile}
			<div class="flex flex-1 items-center justify-center">
				<div class="text-center">
					<div class="mb-2 text-4xl text-text-dim">
						<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
						</svg>
					</div>
					<p class="text-sm text-text-muted">Select a memory file to view or edit</p>
				</div>
			</div>
		{:else if loading}
			<div class="flex flex-1 items-center justify-center">
				<div class="text-sm text-text-muted">Loading {activeFile}...</div>
			</div>
		{:else}
			<!-- File info bar -->
			<div class="flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-raised px-6 py-2">
				<div class="flex items-center gap-3">
					<span class="text-xs text-text-dim font-mono">{agentId}/{activeFile}</span>
					{#if hasChanges}
						<span class="rounded-full bg-warning-muted px-2 py-0.5 text-[10px] text-warning">modified</span>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					{#if saveSuccess}
						<span class="text-xs text-success">Saved</span>
					{/if}
					{#if fileError}
						<span class="text-xs text-danger">{fileError}</span>
					{/if}
					<button
						onclick={saveFile}
						disabled={saving || !hasChanges}
						class="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 active:scale-[0.98]"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>

			<!-- Editor -->
			<div class="flex-1 overflow-auto bg-bg">
				<textarea
					bind:value={fileContent}
					class="h-full w-full resize-none bg-transparent px-6 py-6 text-sm leading-relaxed text-text outline-none font-mono"
					placeholder="Empty memory file"
					spellcheck="false"
				></textarea>
			</div>
		{/if}
	</div>
</div>
