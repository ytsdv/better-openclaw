<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import type { AgentConfig } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto('/connect');
	});

	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const defaultWorkspace = $derived(connection.config?.agents?.defaults?.workspace ?? '~/.openclaw/workspace');

	// Add agent modal
	let showAddModal = $state(false);
	let newId = $state('');
	let newName = $state('');
	let newEmoji = $state('');
	let newWorkspace = $state('');
	let addError = $state<string | null>(null);
	let addLoading = $state(false);

	// Delete confirmation
	let deleteTarget = $state<string | null>(null);
	let deleteLoading = $state(false);

	function openAddModal() {
		newId = '';
		newName = '';
		newEmoji = '';
		newWorkspace = '';
		addError = null;
		showAddModal = true;
	}

	async function addAgent() {
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

		const newAgent: AgentConfig = {
			id: newId.trim(),
			workspace: newWorkspace.trim() || `~/.openclaw/workspace-${newId.trim()}`
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
			showAddModal = false;
		} catch (err) {
			addError = err instanceof Error ? err.message : 'Failed to add agent';
		} finally {
			addLoading = false;
		}
	}

	async function deleteAgent(id: string) {
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
			<h1 class="text-2xl font-bold text-text">Agents</h1>
			<p class="mt-1 text-sm text-text-muted">Manage your OpenClaw agents</p>
		</div>
		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-hover active:scale-[0.98]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			Add Agent
		</button>
	</div>

	<!-- Agents grid -->
	{#if agents.length === 0}
		<div class="rounded-xl border border-border-subtle bg-bg-raised p-8 text-center">
			<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-surface text-2xl text-text-dim">
				M
			</div>
			<h3 class="mb-1 font-semibold text-text">Default Agent</h3>
			<p class="mb-1 text-sm text-text-muted">Your gateway is running with the default "main" agent.</p>
			<p class="text-xs text-text-dim font-mono">{defaultWorkspace}</p>
			<div class="mt-5 flex justify-center gap-3">
				<a
					href="/agents/main/workspace"
					class="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
				>
					Edit Workspace Files
				</a>
				<a
					href="/agents/main/memory"
					class="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
				>
					View Memory
				</a>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each agents as agent}
				<div class="group relative rounded-xl border border-border-subtle bg-bg-raised p-5 transition-all hover:border-border">
					<!-- Delete button -->
					<button
						onclick={() => (deleteTarget = agent.id)}
						class="absolute right-3 top-3 rounded-md p-1.5 text-text-dim opacity-0 transition-all hover:bg-danger-muted hover:text-danger group-hover:opacity-100"
						title="Delete agent"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>

					<div class="mb-4 flex items-center gap-3">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-xl">
							{agent.identity?.emoji ?? agent.id.charAt(0).toUpperCase()}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="font-semibold text-text">{agent.identity?.name ?? agent.id}</span>
								{#if agent.default}
									<span class="rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-medium text-accent">default</span>
								{/if}
							</div>
							<div class="text-xs text-text-dim">{agent.id}</div>
						</div>
					</div>

					{#if agent.identity?.theme}
						<div class="mb-3 text-xs text-text-muted italic">"{agent.identity.theme}"</div>
					{/if}

					{#if agent.workspace}
						<div class="mb-4 truncate rounded-md bg-bg-surface px-2.5 py-1.5 text-xs text-text-dim font-mono">
							{agent.workspace}
						</div>
					{/if}

					{#if agent.model}
						<div class="mb-4 text-xs text-text-muted">
							Model: <span class="text-text font-mono">{typeof agent.model === 'string' ? agent.model : agent.model.primary}</span>
						</div>
					{/if}

					<div class="flex gap-2">
						<a
							href="/agents/{agent.id}"
							class="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-center text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
						>
							Configure
						</a>
						<a
							href="/agents/{agent.id}/workspace"
							class="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-center text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
						>
							Workspace
						</a>
						<a
							href="/agents/{agent.id}/memory"
							class="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-center text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
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
		<div class="w-full max-w-md rounded-2xl border border-border bg-bg-raised p-6 shadow-2xl">
			<h2 class="mb-5 text-lg font-semibold text-text">Add New Agent</h2>

			<div class="space-y-4">
				<div>
					<label for="agent-id" class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">Agent ID *</label>
					<input
						id="agent-id"
						type="text"
						bind:value={newId}
						placeholder="e.g. work, personal, family"
						class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50 font-mono"
					/>
				</div>

				<div>
					<label for="agent-name" class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">Display Name</label>
					<input
						id="agent-name"
						type="text"
						bind:value={newName}
						placeholder="e.g. Work Bot, Samantha"
						class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50"
					/>
				</div>

				<div>
					<label for="agent-emoji" class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">Emoji</label>
					<input
						id="agent-emoji"
						type="text"
						bind:value={newEmoji}
						placeholder="e.g. a lobster"
						class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50"
					/>
				</div>

				<div>
					<label for="agent-workspace" class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">Workspace Path</label>
					<input
						id="agent-workspace"
						type="text"
						bind:value={newWorkspace}
						placeholder="~/.openclaw/workspace-{newId || 'agent'}"
						class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50 font-mono"
					/>
				</div>
			</div>

			{#if addError}
				<div class="mt-4 rounded-lg border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger">
					{addError}
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={() => (showAddModal = false)}
					class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover"
				>
					Cancel
				</button>
				<button
					onclick={addAgent}
					disabled={addLoading}
					class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50"
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
		<div class="w-full max-w-sm rounded-2xl border border-border bg-bg-raised p-6 shadow-2xl">
			<h2 class="mb-2 text-lg font-semibold text-text">Delete Agent</h2>
			<p class="mb-5 text-sm text-text-muted">
				Are you sure you want to delete agent <code class="rounded bg-bg-surface px-1 py-0.5 text-accent font-mono">{deleteTarget}</code>?
				This will remove the agent from the config and its bindings. Workspace files will not be deleted.
			</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={() => (deleteTarget = null)}
					class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover"
				>
					Cancel
				</button>
				<button
					onclick={() => deleteTarget && deleteAgent(deleteTarget)}
					disabled={deleteLoading}
					class="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500 disabled:opacity-50"
				>
					{deleteLoading ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
