<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { AgentConfig, AgentFileEntry } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto(resolve('/connect'));
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
		return f.name === 'MEMORY.md' || f.name.startsWith('memory/') || f.path.includes('/memory/');
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
	<div class="border-border bg-bg-raised flex w-64 shrink-0 flex-col border-r">
		<div class="border-border border-b px-4 py-4">
			<div class="text-text-dim mb-3 flex items-center gap-2 text-sm">
				<a href={resolve('/agents')} class="hover:text-text transition-colors">Agents</a>
				<span>/</span>
				<a href={resolve(`/agents/${agentId}`)} class="hover:text-text transition-colors"
					>{agent?.identity?.name ?? agentId}</a
				>
			</div>

			<!-- Navigation tabs -->
			<div class="border-border bg-bg flex gap-1 rounded-lg border p-1">
				<a
					href={resolve(`/agents/${agentId}`)}
					class="text-text-muted hover:text-text rounded-md px-3 py-1.5 text-xs transition-colors"
				>
					Config
				</a>
				<a
					href={resolve(`/agents/${agentId}/workspace`)}
					class="text-text-muted hover:text-text rounded-md px-3 py-1.5 text-xs transition-colors"
				>
					Files
				</a>
				<a
					href={resolve(`/agents/${agentId}/memory`)}
					class="bg-bg-hover text-text rounded-md px-3 py-1.5 text-xs font-medium"
				>
					Memory
				</a>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto px-2 py-2">
			{#if loadingFiles}
				<div class="text-text-dim p-4 text-center text-xs">Loading memory files...</div>
			{:else if memoryFiles.length === 0}
				<div class="text-text-dim p-4 text-center text-xs">No memory files found</div>
			{:else}
				<div class="space-y-0.5">
					{#each memoryFiles as file (file.name)}
						<button
							onclick={() => (activeFile = file.name)}
							class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors"
							class:bg-accent-muted={activeFile === file.name}
							class:text-accent={activeFile === file.name}
							class:text-text-muted={activeFile !== file.name}
							class:hover:bg-bg-hover={activeFile !== file.name}
						>
							{#if isLongTermMemory(file)}
								<svg
									class="h-3.5 w-3.5 shrink-0"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="1.5"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
									/>
								</svg>
								<span class="font-medium">MEMORY.md</span>
							{:else}
								<svg
									class="h-3.5 w-3.5 shrink-0"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="1.5"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
									/>
								</svg>
								<span class="font-mono">{getDisplayName(file)}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="border-border border-t p-3">
			<button
				onclick={loadMemoryFiles}
				class="border-border text-text-muted hover:bg-bg-hover hover:text-text w-full rounded-md border px-3 py-1.5 text-xs transition-colors"
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
					<div class="text-text-dim mb-2 text-4xl">
						<svg
							class="mx-auto h-12 w-12"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
							/>
						</svg>
					</div>
					<p class="text-text-muted text-sm">Select a memory file to view or edit</p>
				</div>
			</div>
		{:else if loading}
			<div class="flex flex-1 items-center justify-center">
				<div class="text-text-muted text-sm">Loading {activeFile}...</div>
			</div>
		{:else}
			<!-- File info bar -->
			<div
				class="border-border-subtle bg-bg-raised flex shrink-0 items-center justify-between border-b px-6 py-2"
			>
				<div class="flex items-center gap-3">
					<span class="text-text-dim font-mono text-xs">{agentId}/{activeFile}</span>
					{#if hasChanges}
						<span class="bg-warning-muted text-warning rounded-full px-2 py-0.5 text-[10px]"
							>modified</span
						>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					{#if saveSuccess}
						<span class="text-success text-xs">Saved</span>
					{/if}
					{#if fileError}
						<span class="text-danger text-xs">{fileError}</span>
					{/if}
					<button
						onclick={saveFile}
						disabled={saving || !hasChanges}
						class="bg-accent hover:bg-accent-hover rounded-md px-4 py-1.5 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>

			<!-- Editor -->
			<div class="bg-bg flex-1 overflow-auto">
				<textarea
					bind:value={fileContent}
					class="text-text h-full w-full resize-none bg-transparent px-6 py-6 font-mono text-sm leading-relaxed outline-none"
					placeholder="Empty memory file"
					spellcheck="false"
				></textarea>
			</div>
		{/if}
	</div>
</div>
