<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { AgentConfig } from '$lib/gateway/types.js';
	import type { AgentFileEntry } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto('/connect');
	});

	const agentId = $derived(page.params.id as string);
	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const agent = $derived(agents.find((a) => a.id === agentId));

	const workspaceFiles = [
		{ name: 'SOUL.md', description: 'Persona, tone, and boundaries' },
		{ name: 'AGENTS.md', description: 'Operating instructions and memory rules' },
		{ name: 'USER.md', description: 'Who the user is and preferences' },
		{ name: 'IDENTITY.md', description: 'Agent name, vibe, and emoji' },
		{ name: 'TOOLS.md', description: 'Notes about local tools and conventions' },
		{ name: 'HEARTBEAT.md', description: 'Checklist for heartbeat runs' },
		{ name: 'BOOT.md', description: 'Startup checklist on gateway restart' },
		{ name: 'BOOTSTRAP.md', description: 'One-time first-run ritual' }
	];

	let activeTab = $state('SOUL.md');
	let fileContent = $state('');
	let originalContent = $state('');
	let loading = $state(false);
	let saving = $state(false);
	let fileError = $state<string | null>(null);
	let saveSuccess = $state(false);
	let existingFiles = $state<Set<string>>(new Set());
	let allFiles = $state<AgentFileEntry[]>([]);
	let initialized = $state(false);

	// Load file list on mount
	$effect(() => {
		if (connection.isConnected && agentId && !initialized) {
			initialized = true;
			checkExistingFiles();
		}
	});

	// Load file content when tab changes
	$effect(() => {
		if (activeTab && agentId && connection.isConnected) {
			loadFile(activeTab);
		}
	});

	async function checkExistingFiles() {
		try {
			const tools = connection.getToolsClient();
			allFiles = await tools.listAllFiles(agentId);
			existingFiles = new Set(allFiles.filter((f) => !f.missing).map((f) => f.name));
		} catch {
			// Ignore errors, just show all tabs
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
			if (!content && !existingFiles.has(fileName)) {
				fileError = 'File does not exist yet. Edit and save to create it.';
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('not found') || msg.includes('missing')) {
				fileContent = '';
				originalContent = '';
				fileError = 'File does not exist yet. Edit and save to create it.';
			} else {
				fileError = msg;
			}
		} finally {
			loading = false;
		}
	}

	async function saveFile() {
		saving = true;
		fileError = null;
		saveSuccess = false;

		try {
			const tools = connection.getToolsClient();
			await tools.setFile(agentId, activeTab, fileContent);
			originalContent = fileContent;
			saveSuccess = true;
			existingFiles.add(activeTab);
			existingFiles = existingFiles; // trigger reactivity
			setTimeout(() => (saveSuccess = false), 3000);
		} catch (err) {
			fileError = err instanceof Error ? err.message : 'Failed to save file';
		} finally {
			saving = false;
		}
	}

	const hasChanges = $derived(fileContent !== originalContent);
</script>

<div class="flex h-dvh flex-col overflow-hidden">
	<!-- Header -->
	<div class="shrink-0 border-b border-border bg-bg-raised px-8 py-4">
		<div class="mb-3 flex items-center gap-2 text-sm text-text-dim">
			<a href="/agents" class="transition-colors hover:text-text">Agents</a>
			<span>/</span>
			<a href="/agents/{agentId}" class="transition-colors hover:text-text">{agent?.identity?.name ?? agentId}</a>
			<span>/</span>
			<span class="text-text">Workspace Files</span>
		</div>

		<!-- Navigation tabs -->
		<div class="mb-3 flex gap-1 rounded-lg border border-border bg-bg p-1">
			<a
				href="/agents/{agentId}"
				class="rounded-md px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
			>
				Config
			</a>
			<a
				href="/agents/{agentId}/workspace"
				class="rounded-md bg-bg-hover px-4 py-2 text-sm font-medium text-text"
			>
				Workspace Files
			</a>
			<a
				href="/agents/{agentId}/memory"
				class="rounded-md px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
			>
				Memory
			</a>
		</div>

		<!-- File tabs -->
		<div class="flex gap-1 overflow-x-auto">
			{#each workspaceFiles as file}
				<button
					onclick={() => (activeTab = file.name)}
					class="shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors"
					class:bg-accent-muted={activeTab === file.name}
					class:text-accent={activeTab === file.name}
					class:font-medium={activeTab === file.name}
					class:text-text-muted={activeTab !== file.name}
					class:hover:text-text={activeTab !== file.name}
					title={file.description}
				>
					{file.name}
					{#if existingFiles.has(file.name)}
						<span class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-success"></span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Editor area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		{#if loading}
			<div class="flex flex-1 items-center justify-center">
				<div class="text-sm text-text-muted">Loading {activeTab}...</div>
			</div>
		{:else}
			<!-- File info bar -->
			<div class="flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-raised px-8 py-2">
				<div class="flex items-center gap-3">
					<span class="text-xs text-text-dim font-mono">{agentId}/{activeTab}</span>
					{#if hasChanges}
						<span class="rounded-full bg-warning-muted px-2 py-0.5 text-[10px] text-warning">modified</span>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					{#if saveSuccess}
						<span class="text-xs text-success">Saved</span>
					{/if}
					{#if fileError && !fileError.includes('does not exist')}
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

			{#if fileError && fileError.includes('does not exist')}
				<div class="shrink-0 border-b border-border-subtle bg-warning-muted px-8 py-2 text-xs text-warning">
					{fileError}
				</div>
			{/if}

			<!-- Textarea editor -->
			<div class="flex-1 overflow-auto bg-bg p-0">
				<textarea
					bind:value={fileContent}
					class="h-full w-full resize-none bg-transparent px-8 py-6 text-sm leading-relaxed text-text outline-none font-mono"
					placeholder="Start writing..."
					spellcheck="false"
				></textarea>
			</div>
		{/if}
	</div>
</div>
