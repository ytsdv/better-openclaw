<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import type { AgentConfig } from '$lib/gateway/types.js';
	import type { AgentFileEntry } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto(resolve('/connect'));
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
	let existingFiles = new SvelteSet<string>();
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
			existingFiles.clear();
			for (const f of allFiles) {
				if (!f.missing) existingFiles.add(f.name);
			}
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
	<div class="border-border bg-bg-raised shrink-0 border-b px-8 py-4">
		<div class="text-text-dim mb-3 flex items-center gap-2 text-sm">
			<a href={resolve('/agents')} class="hover:text-text transition-colors">Agents</a>
			<span>/</span>
			<a href={resolve(`/agents/${agentId}`)} class="hover:text-text transition-colors"
				>{agent?.identity?.name ?? agentId}</a
			>
			<span>/</span>
			<span class="text-text">Workspace Files</span>
		</div>

		<!-- Navigation tabs -->
		<div class="border-border bg-bg mb-3 flex gap-1 rounded-lg border p-1">
			<a
				href={resolve(`/agents/${agentId}`)}
				class="text-text-muted hover:text-text rounded-md px-4 py-2 text-sm transition-colors"
			>
				Config
			</a>
			<a
				href={resolve(`/agents/${agentId}/workspace`)}
				class="bg-bg-hover text-text rounded-md px-4 py-2 text-sm font-medium"
			>
				Workspace Files
			</a>
			<a
				href={resolve(`/agents/${agentId}/memory`)}
				class="text-text-muted hover:text-text rounded-md px-4 py-2 text-sm transition-colors"
			>
				Memory
			</a>
		</div>

		<!-- File tabs -->
		<div class="flex gap-1 overflow-x-auto">
			{#each workspaceFiles as file (file.name)}
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
						<span class="bg-success ml-1 inline-block h-1.5 w-1.5 rounded-full"></span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Editor area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		{#if loading}
			<div class="flex flex-1 items-center justify-center">
				<div class="text-text-muted text-sm">Loading {activeTab}...</div>
			</div>
		{:else}
			<!-- File info bar -->
			<div
				class="border-border-subtle bg-bg-raised flex shrink-0 items-center justify-between border-b px-8 py-2"
			>
				<div class="flex items-center gap-3">
					<span class="text-text-dim font-mono text-xs">{agentId}/{activeTab}</span>
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
					{#if fileError && !fileError.includes('does not exist')}
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

			{#if fileError && fileError.includes('does not exist')}
				<div
					class="border-border-subtle bg-warning-muted text-warning shrink-0 border-b px-8 py-2 text-xs"
				>
					{fileError}
				</div>
			{/if}

			<!-- Textarea editor -->
			<div class="bg-bg flex-1 overflow-auto p-0">
				<textarea
					bind:value={fileContent}
					class="text-text h-full w-full resize-none bg-transparent px-8 py-6 font-mono text-sm leading-relaxed outline-none"
					placeholder="Start writing..."
					spellcheck="false"
				></textarea>
			</div>
		{/if}
	</div>
</div>
