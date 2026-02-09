<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { AgentConfig } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto('/connect');
	});

	const agentId = $derived(page.params.id as string);
	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const agent = $derived(agents.find((a) => a.id === agentId));
	const defaultWorkspace = $derived(connection.config?.agents?.defaults?.workspace ?? '~/.openclaw/workspace');

	// If no agents list but id is "main", show default agent
	const isDefault = $derived(agentId === 'main' && agents.length === 0);
	const workspace = $derived(agent?.workspace ?? (isDefault ? defaultWorkspace : `~/.openclaw/workspace-${agentId}`));

	// Edit form state
	let editName = $state('');
	let editEmoji = $state('');
	let editTheme = $state('');
	let editModel = $state('');
	let editWorkspace = $state('');
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	// Initialize form when agent changes
	$effect(() => {
		if (agent) {
			editName = agent.identity?.name ?? '';
			editEmoji = agent.identity?.emoji ?? '';
			editTheme = agent.identity?.theme ?? '';
			editModel = typeof agent.model === 'string' ? agent.model : (agent.model?.primary ?? '');
			editWorkspace = agent.workspace ?? '';
		}
	});

	async function saveAgent() {
		if (!agent) return;
		saving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const updatedAgent: AgentConfig = {
				...agent,
				identity: {
					...agent.identity,
					name: editName.trim() || undefined,
					emoji: editEmoji.trim() || undefined,
					theme: editTheme.trim() || undefined
				}
			};
			if (editModel.trim()) {
				updatedAgent.model = editModel.trim();
			}
			if (editWorkspace.trim()) {
				updatedAgent.workspace = editWorkspace.trim();
			}

			const updatedList = agents.map((a) => (a.id === agentId ? updatedAgent : a));
			const patch = JSON.stringify({ agents: { list: updatedList } });
			await connection.patchConfig(patch);
			saveSuccess = true;
			setTimeout(() => (saveSuccess = false), 3000);
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			saving = false;
		}
	}
</script>

<div class="p-8">
	<!-- Breadcrumb -->
	<div class="mb-6 flex items-center gap-2 text-sm text-text-dim">
		<a href="/agents" class="transition-colors hover:text-text">Agents</a>
		<span>/</span>
		<span class="text-text">{agent?.identity?.name ?? agentId}</span>
	</div>

	{#if !agent && !isDefault}
		<div class="rounded-xl border border-border bg-bg-raised p-8 text-center">
			<p class="text-text-muted">Agent "{agentId}" not found</p>
			<a href="/agents" class="mt-3 inline-block text-sm text-accent hover:text-accent-hover">Back to agents</a>
		</div>
	{:else}
		<!-- Agent header -->
		<div class="mb-8 flex items-center gap-4">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-muted text-3xl">
				{agent?.identity?.emoji ?? agentId.charAt(0).toUpperCase()}
			</div>
			<div>
				<h1 class="text-2xl font-bold text-text">{agent?.identity?.name ?? agentId}</h1>
				<p class="text-sm text-text-dim font-mono">{agentId}</p>
			</div>
		</div>

		<!-- Navigation tabs -->
		<div class="mb-6 flex gap-1 rounded-lg border border-border bg-bg-raised p-1">
			<a
				href="/agents/{agentId}"
				class="rounded-md bg-bg-hover px-4 py-2 text-sm font-medium text-text"
			>
				Config
			</a>
			<a
				href="/agents/{agentId}/workspace"
				class="rounded-md px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
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

		<!-- Config form -->
		<div class="space-y-6">
			<!-- Identity section -->
			<div class="rounded-xl border border-border bg-bg-raised p-6">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-dim">Identity</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="edit-name" class="mb-1.5 block text-xs text-text-dim">Display Name</label>
						<input
							id="edit-name"
							type="text"
							bind:value={editName}
							placeholder="e.g. Samantha"
							class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50"
						/>
					</div>
					<div>
						<label for="edit-emoji" class="mb-1.5 block text-xs text-text-dim">Emoji</label>
						<input
							id="edit-emoji"
							type="text"
							bind:value={editEmoji}
							placeholder="e.g. a lobster"
							class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50"
						/>
					</div>
					<div class="sm:col-span-2">
						<label for="edit-theme" class="mb-1.5 block text-xs text-text-dim">Theme / Vibe</label>
						<input
							id="edit-theme"
							type="text"
							bind:value={editTheme}
							placeholder="e.g. helpful space lobster"
							class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50"
						/>
					</div>
				</div>
			</div>

			<!-- Model section -->
			<div class="rounded-xl border border-border bg-bg-raised p-6">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-dim">Model</h2>
				<div>
					<label for="edit-model" class="mb-1.5 block text-xs text-text-dim">Primary Model (provider/model)</label>
					<input
						id="edit-model"
						type="text"
						bind:value={editModel}
						placeholder="e.g. anthropic/claude-sonnet-4-5"
						class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50 font-mono"
					/>
				</div>
			</div>

			<!-- Workspace section -->
			<div class="rounded-xl border border-border bg-bg-raised p-6">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-dim">Workspace</h2>
				<div>
					<label for="edit-workspace" class="mb-1.5 block text-xs text-text-dim">Workspace Path</label>
					<input
						id="edit-workspace"
						type="text"
						bind:value={editWorkspace}
						placeholder={workspace}
						class="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder-text-dim outline-none focus:border-accent/50 font-mono"
					/>
				</div>
			</div>

			<!-- Sandbox section (read-only display) -->
			{#if agent?.sandbox}
				<div class="rounded-xl border border-border bg-bg-raised p-6">
					<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-dim">Sandbox</h2>
					<div class="grid gap-3 text-sm sm:grid-cols-3">
						<div>
							<span class="text-text-dim">Mode:</span>
							<span class="ml-2 font-mono text-text">{agent.sandbox.mode ?? 'off'}</span>
						</div>
						<div>
							<span class="text-text-dim">Scope:</span>
							<span class="ml-2 font-mono text-text">{agent.sandbox.scope ?? 'session'}</span>
						</div>
						<div>
							<span class="text-text-dim">Workspace Access:</span>
							<span class="ml-2 font-mono text-text">{agent.sandbox.workspaceAccess ?? 'rw'}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Tool restrictions (read-only display) -->
			{#if agent?.tools}
				<div class="rounded-xl border border-border bg-bg-raised p-6">
					<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-text-dim">Tool Restrictions</h2>
					{#if agent.tools.allow}
						<div class="mb-2">
							<span class="text-xs text-text-dim">Allowed:</span>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each agent.tools.allow as tool}
									<span class="rounded-md bg-success-muted px-2 py-0.5 text-xs text-success font-mono">{tool}</span>
								{/each}
							</div>
						</div>
					{/if}
					{#if agent.tools.deny}
						<div>
							<span class="text-xs text-text-dim">Denied:</span>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each agent.tools.deny as tool}
									<span class="rounded-md bg-danger-muted px-2 py-0.5 text-xs text-danger font-mono">{tool}</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Save button -->
			{#if agent}
				<div class="flex items-center gap-3">
					<button
						onclick={saveAgent}
						disabled={saving}
						class="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50 active:scale-[0.98]"
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					{#if saveSuccess}
						<span class="text-sm text-success">Saved successfully</span>
					{/if}
					{#if saveError}
						<span class="text-sm text-danger">{saveError}</span>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
