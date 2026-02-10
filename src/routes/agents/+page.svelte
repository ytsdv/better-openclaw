<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import type { AgentConfig } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto(resolve('/connect'));
	});

	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const defaultWorkspace = $derived(
		connection.config?.agents?.defaults?.workspace ?? '~/.openclaw/workspace'
	);
	const isGatewayRestarting = $derived(connection.status === 'reconnecting');

	// Add agent modal
	let showAddModal = $state(false);
	let newId = $state('');
	let newName = $state('');
	let newEmoji = $state('');
	let newWorkspace = $state('');
	let addError = $state<string | null>(null);
	let addLoading = $state(false);
	let uploadError = $state<string | null>(null);
	let dropActive = $state(false);
	let uploadedFiles = new SvelteMap<string, File>();

	const allowedAgentFiles = [
		'SOUL.md',
		'AGENTS.md',
		'USER.md',
		'IDENTITY.md',
		'TOOLS.md',
		'HEARTBEAT.md',
		'BOOTSTRAP.md'
	];
	const allowedAgentFileMap = new Map(
		allowedAgentFiles.map((name) => [normalizeFileName(name), name])
	);

	// Delete confirmation
	let deleteTarget = $state<string | null>(null);
	let deleteLoading = $state(false);

	function openAddModal() {
		if (isGatewayRestarting) return;
		newId = '';
		newName = '';
		newEmoji = '';
		newWorkspace = '';
		addError = null;
		uploadError = null;
		dropActive = false;
		uploadedFiles.clear();
		showAddModal = true;
	}

	function normalizeFileName(name: string): string {
		return name.trim().toUpperCase();
	}

	function validateAndQueueFiles(files: FileList | File[]) {
		uploadError = null;
		const validated: Array<[string, File]> = [];

		for (const file of Array.from(files)) {
			const normalized = normalizeFileName(file.name);
			const canonical = allowedAgentFileMap.get(normalized);
			if (!canonical) {
				uploadError = `Unsupported file: ${file.name}. Use only ${allowedAgentFiles.join(', ')}`;
				continue;
			}
			validated.push([canonical, file]);
		}

		if (uploadedFiles.size + validated.length > allowedAgentFiles.length) {
			uploadError = `Too many files. Max ${allowedAgentFiles.length} allowed.`;
			return;
		}

		for (const [key, value] of validated) {
			uploadedFiles.set(key, value);
		}
	}

	function onFileInputChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			validateAndQueueFiles(input.files);
			input.value = '';
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dropActive = false;
		if (event.dataTransfer?.files?.length) {
			validateAndQueueFiles(event.dataTransfer.files);
		}
	}

	function removeQueuedFile(name: string) {
		uploadedFiles.delete(name);
	}

	async function addAgent() {
		if (isGatewayRestarting) {
			addError = 'Gateway is restarting. Please wait before adding agents.';
			return;
		}
		if (!newId.trim()) {
			addError = 'Agent ID is required';
			return;
		}
		if (agents.some((a) => a.id === newId.trim())) {
			addError = 'An agent with this ID already exists';
			return;
		}

		addLoading = true;
		addError = null;
		uploadError = null;

		const agentId = newId.trim();
		const newAgent: AgentConfig = {
			id: agentId,
			workspace: newWorkspace.trim() || `~/.openclaw/workspace-${agentId}`
		};
		if (newName.trim()) {
			newAgent.identity = { name: newName.trim() };
			if (newEmoji.trim()) newAgent.identity.emoji = newEmoji.trim();
		} else if (newEmoji.trim()) {
			newAgent.identity = { emoji: newEmoji.trim() };
		}

		try {
			const updatedList = [...agents, newAgent];
			const patch = JSON.stringify({ agents: { list: updatedList } });
			await connection.patchConfig(patch);

			if (uploadedFiles.size > 0) {
				const tools = connection.getToolsClient();
				for (const [name, file] of uploadedFiles) {
					const content = await file.text();
					await tools.setFile(agentId, name, content);
				}
			}

			showAddModal = false;
		} catch (err) {
			if (uploadedFiles.size > 0) {
				uploadError = err instanceof Error ? err.message : 'Failed to upload agent files';
			} else {
				addError = err instanceof Error ? err.message : 'Failed to add agent';
			}
		} finally {
			addLoading = false;
		}
	}

	async function deleteAgent(id: string) {
		if (isGatewayRestarting) return;
		deleteLoading = true;
		try {
			const updatedList = agents.filter((a) => a.id !== id);
			// Also remove bindings for this agent
			const bindings = (connection.config?.bindings ?? []).filter(
				(b: { agentId: string }) => b.agentId !== id
			);
			const patch = JSON.stringify({ agents: { list: updatedList }, bindings });
			await connection.patchConfig(patch);
			deleteTarget = null;
		} catch (err) {
			console.error('Failed to delete agent:', err);
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="p-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-text text-2xl font-bold">Agents</h1>
			<p class="text-text-muted mt-1 text-sm">Manage your OpenClaw agents</p>
		</div>
		<button
			onclick={openAddModal}
			disabled={isGatewayRestarting}
			title={isGatewayRestarting ? 'Gateway is restarting' : undefined}
			class="bg-accent hover:bg-accent-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			Add Agent
		</button>
	</div>

	<!-- Agents grid -->
	{#if agents.length === 0}
		<div class="border-border-subtle bg-bg-raised rounded-xl border p-8 text-center">
			<div
				class="bg-bg-surface text-text-dim mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
			>
				M
			</div>
			<h3 class="text-text mb-1 font-semibold">Default Agent</h3>
			<p class="text-text-muted mb-1 text-sm">
				Your gateway is running with the default "main" agent.
			</p>
			<p class="text-text-dim font-mono text-xs">{defaultWorkspace}</p>
			<div class="mt-5 flex justify-center gap-3">
				<a
					href={resolve('/agents/main/workspace')}
					class="border-border bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors"
				>
					Edit Workspace Files
				</a>
				<a
					href={resolve('/agents/main/memory')}
					class="border-border bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors"
				>
					View Memory
				</a>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each agents as agent (agent.id)}
				<div
					class="group border-border-subtle bg-bg-raised hover:border-border relative rounded-xl border p-5 transition-all"
				>
					<!-- Delete button -->
					<button
						onclick={() => (deleteTarget = agent.id)}
						disabled={isGatewayRestarting}
						title={isGatewayRestarting ? 'Gateway is restarting' : 'Delete agent'}
						class="text-text-dim hover:bg-danger-muted hover:text-danger absolute top-3 right-3 rounded-md p-1.5 opacity-0 transition-all group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>

					<div class="mb-4 flex items-center gap-3">
						<div
							class="bg-accent-muted flex h-12 w-12 items-center justify-center rounded-xl text-xl"
						>
							{agent.identity?.emoji ?? agent.id.charAt(0).toUpperCase()}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-text font-semibold">{agent.identity?.name ?? agent.id}</span>
								{#if agent.default}
									<span
										class="bg-accent-muted text-accent rounded-full px-2 py-0.5 text-[10px] font-medium"
										>default</span
									>
								{/if}
							</div>
							<div class="text-text-dim text-xs">{agent.id}</div>
						</div>
					</div>

					{#if agent.identity?.theme}
						<div class="text-text-muted mb-3 text-xs italic">"{agent.identity.theme}"</div>
					{/if}

					{#if agent.workspace}
						<div
							class="bg-bg-surface text-text-dim mb-4 truncate rounded-md px-2.5 py-1.5 font-mono text-xs"
						>
							{agent.workspace}
						</div>
					{/if}

					{#if agent.model}
						<div class="text-text-muted mb-4 text-xs">
							Model: <span class="text-text font-mono"
								>{typeof agent.model === 'string' ? agent.model : agent.model.primary}</span
							>
						</div>
					{/if}

					<div class="flex gap-2">
						<a
							href={resolve(`/agents/${agent.id}`)}
							class="border-border bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text flex-1 rounded-lg border px-3 py-1.5 text-center text-xs transition-colors"
						>
							Configure
						</a>
						<a
							href={resolve(`/agents/${agent.id}/workspace`)}
							class="border-border bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text flex-1 rounded-lg border px-3 py-1.5 text-center text-xs transition-colors"
						>
							Workspace
						</a>
						<a
							href={resolve(`/agents/${agent.id}/memory`)}
							class="border-border bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text flex-1 rounded-lg border px-3 py-1.5 text-center text-xs transition-colors"
						>
							Memory
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Agent Modal -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="border-border bg-bg-raised w-full max-w-md rounded-2xl border p-6 shadow-2xl">
			<h2 class="text-text mb-5 text-lg font-semibold">Add New Agent</h2>
			{#if isGatewayRestarting}
				<div
					class="border-warning/20 bg-warning-muted text-warning mb-4 rounded-lg border px-3 py-2 text-sm"
				>
					Gateway is restarting. Adding agents is temporarily disabled.
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label
						for="agent-id"
						class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
						>Agent ID *</label
					>
					<input
						id="agent-id"
						type="text"
						bind:value={newId}
						placeholder="e.g. work, personal, family"
						disabled={isGatewayRestarting}
						class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none"
					/>
				</div>

				<div>
					<label
						for="agent-name"
						class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
						>Display Name</label
					>
					<input
						id="agent-name"
						type="text"
						bind:value={newName}
						placeholder="e.g. Work Bot, Samantha"
						disabled={isGatewayRestarting}
						class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 text-sm outline-none"
					/>
				</div>

				<div>
					<label
						for="agent-emoji"
						class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
						>Emoji</label
					>
					<input
						id="agent-emoji"
						type="text"
						bind:value={newEmoji}
						placeholder="e.g. a lobster"
						disabled={isGatewayRestarting}
						class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 text-sm outline-none"
					/>
				</div>

				<div>
					<label
						for="agent-workspace"
						class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
						>Workspace Path</label
					>
					<input
						id="agent-workspace"
						type="text"
						bind:value={newWorkspace}
						placeholder="~/.openclaw/workspace-{newId || 'agent'}"
						disabled={isGatewayRestarting}
						class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none"
					/>
				</div>

				<div>
					<label class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
						>Agent Files (Optional)</label
					>
					<div
						class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-center text-xs transition-colors"
						class:border-accent={dropActive}
						class:bg-bg-hover={dropActive}
						class:border-border={!dropActive}
						class:opacity-60={isGatewayRestarting}
						ondragover={(event) => {
							if (isGatewayRestarting) return;
							event.preventDefault();
							dropActive = true;
						}}
						ondragleave={() => (dropActive = false)}
						ondrop={(event) => {
							if (isGatewayRestarting) return;
							onDrop(event);
						}}
					>
						<p class="text-text-muted">Drop up to 7 markdown files or click to browse</p>
						<p class="text-text-dim font-mono text-[10px]">
							SOUL.md, AGENTS.md, USER.md, IDENTITY.md, TOOLS.md, HEARTBEAT.md, BOOTSTRAP.md
						</p>
						<label
							class="border-border bg-bg-surface text-text-muted hover:bg-bg-hover hover:text-text mt-1 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors"
						>
							<input
								type="file"
								accept=".md"
								multiple
								disabled={isGatewayRestarting}
								class="hidden"
								onchange={onFileInputChange}
							/>
							Browse Files
						</label>
					</div>
					{#if uploadedFiles.size > 0}
						<div class="mt-2 flex flex-wrap gap-2">
							{#each Array.from(uploadedFiles.keys()) as fileName (fileName)}
								<div
									class="bg-bg-surface text-text flex items-center gap-2 rounded-md px-2.5 py-1 text-xs"
								>
									<span class="font-mono">{fileName}</span>
									<button
										onclick={() => removeQueuedFile(fileName)}
										class="text-text-dim hover:text-danger transition-colors"
										title="Remove file"
									>
										×
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			{#if addError}
				<div
					class="border-danger/20 bg-danger-muted text-danger mt-4 rounded-lg border px-3 py-2 text-sm"
				>
					{addError}
				</div>
			{/if}
			{#if uploadError}
				<div
					class="border-danger/20 bg-danger-muted text-danger mt-4 rounded-lg border px-3 py-2 text-sm"
				>
					{uploadError}
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={() => (showAddModal = false)}
					class="border-border text-text-muted hover:bg-bg-hover rounded-lg border px-4 py-2 text-sm transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={addAgent}
					disabled={addLoading || isGatewayRestarting}
					class="bg-accent hover:bg-accent-hover rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
				>
					{addLoading ? 'Adding...' : 'Add Agent'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="border-border bg-bg-raised w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
			<h2 class="text-text mb-2 text-lg font-semibold">Delete Agent</h2>
			<p class="text-text-muted mb-5 text-sm">
				Are you sure you want to delete agent <code
					class="bg-bg-surface text-accent rounded px-1 py-0.5 font-mono">{deleteTarget}</code
				>? This will remove the agent from the config and its bindings. Workspace files will not be
				deleted.
			</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={() => (deleteTarget = null)}
					class="border-border text-text-muted hover:bg-bg-hover rounded-lg border px-4 py-2 text-sm transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={() => deleteTarget && deleteAgent(deleteTarget)}
					disabled={deleteLoading || isGatewayRestarting}
					class="bg-danger rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500 disabled:opacity-50"
				>
					{deleteLoading ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
