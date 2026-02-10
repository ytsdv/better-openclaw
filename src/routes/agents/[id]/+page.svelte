<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { AgentConfig } from '$lib/gateway/types.js';

	$effect(() => {
		if (!connection.isActive) goto(resolve('/connect'));
	});

	const agentId = $derived(page.params.id as string);
	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const agent = $derived(agents.find((a) => a.id === agentId));
	const defaultWorkspace = $derived(
		connection.config?.agents?.defaults?.workspace ?? '~/.openclaw/workspace'
	);

	// If no agents list but id is "main", show default agent
	const isDefault = $derived(agentId === 'main' && agents.length === 0);
	const workspace = $derived(
		agent?.workspace ?? (isDefault ? defaultWorkspace : `~/.openclaw/workspace-${agentId}`)
	);

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
	<div class="text-text-dim mb-6 flex items-center gap-2 text-sm">
		<a href={resolve('/agents')} class="hover:text-text transition-colors">Agents</a>
		<span>/</span>
		<span class="text-text">{agent?.identity?.name ?? agentId}</span>
	</div>

	{#if !agent && !isDefault}
		<div class="border-border bg-bg-raised rounded-xl border p-8 text-center">
			<p class="text-text-muted">Agent "{agentId}" not found</p>
			<a
				href={resolve('/agents')}
				class="text-accent hover:text-accent-hover mt-3 inline-block text-sm">Back to agents</a
			>
		</div>
	{:else}
		<!-- Agent header -->
		<div class="mb-8 flex items-center gap-4">
			<div class="bg-accent-muted flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
				{agent?.identity?.emoji ?? agentId.charAt(0).toUpperCase()}
			</div>
			<div>
				<h1 class="text-text text-2xl font-bold">{agent?.identity?.name ?? agentId}</h1>
				<p class="text-text-dim font-mono text-sm">{agentId}</p>
			</div>
		</div>

		<!-- Navigation tabs -->
		<div class="border-border bg-bg-raised mb-6 flex gap-1 rounded-lg border p-1">
			<a
				href={resolve(`/agents/${agentId}`)}
				class="bg-bg-hover text-text rounded-md px-4 py-2 text-sm font-medium"
			>
				Config
			</a>
			<a
				href={resolve(`/agents/${agentId}/workspace`)}
				class="text-text-muted hover:text-text rounded-md px-4 py-2 text-sm transition-colors"
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

		<!-- Config form -->
		<div class="space-y-6">
			<!-- Identity section -->
			<div class="border-border bg-bg-raised rounded-xl border p-6">
				<h2 class="text-text-dim mb-4 text-sm font-semibold tracking-wider uppercase">Identity</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="edit-name" class="text-text-dim mb-1.5 block text-xs">Display Name</label>
						<input
							id="edit-name"
							type="text"
							bind:value={editName}
							placeholder="e.g. Samantha"
							class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 text-sm outline-none"
						/>
					</div>
					<div>
						<label for="edit-emoji" class="text-text-dim mb-1.5 block text-xs">Emoji</label>
						<input
							id="edit-emoji"
							type="text"
							bind:value={editEmoji}
							placeholder="e.g. a lobster"
							class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 text-sm outline-none"
						/>
					</div>
					<div class="sm:col-span-2">
						<label for="edit-theme" class="text-text-dim mb-1.5 block text-xs">Theme / Vibe</label>
						<input
							id="edit-theme"
							type="text"
							bind:value={editTheme}
							placeholder="e.g. helpful space lobster"
							class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 text-sm outline-none"
						/>
					</div>
				</div>
			</div>

			<!-- Model section -->
			<div class="border-border bg-bg-raised rounded-xl border p-6">
				<h2 class="text-text-dim mb-4 text-sm font-semibold tracking-wider uppercase">Model</h2>
				<div>
					<label for="edit-model" class="text-text-dim mb-1.5 block text-xs"
						>Primary Model (provider/model)</label
					>
					<input
						id="edit-model"
						type="text"
						bind:value={editModel}
						placeholder="e.g. anthropic/claude-sonnet-4-5"
						class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none"
					/>
				</div>
			</div>

			<!-- Workspace section -->
			<div class="border-border bg-bg-raised rounded-xl border p-6">
				<h2 class="text-text-dim mb-4 text-sm font-semibold tracking-wider uppercase">Workspace</h2>
				<div>
					<label for="edit-workspace" class="text-text-dim mb-1.5 block text-xs"
						>Workspace Path</label
					>
					<input
						id="edit-workspace"
						type="text"
						bind:value={editWorkspace}
						placeholder={workspace}
						class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none"
					/>
				</div>
			</div>

			<!-- Sandbox section (read-only display) -->
			{#if agent?.sandbox}
				<div class="border-border bg-bg-raised rounded-xl border p-6">
					<h2 class="text-text-dim mb-4 text-sm font-semibold tracking-wider uppercase">Sandbox</h2>
					<div class="grid gap-3 text-sm sm:grid-cols-3">
						<div>
							<span class="text-text-dim">Mode:</span>
							<span class="text-text ml-2 font-mono">{agent.sandbox.mode ?? 'off'}</span>
						</div>
						<div>
							<span class="text-text-dim">Scope:</span>
							<span class="text-text ml-2 font-mono">{agent.sandbox.scope ?? 'session'}</span>
						</div>
						<div>
							<span class="text-text-dim">Workspace Access:</span>
							<span class="text-text ml-2 font-mono">{agent.sandbox.workspaceAccess ?? 'rw'}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Tool restrictions (read-only display) -->
			{#if agent?.tools}
				<div class="border-border bg-bg-raised rounded-xl border p-6">
					<h2 class="text-text-dim mb-4 text-sm font-semibold tracking-wider uppercase">
						Tool Restrictions
					</h2>
					{#if agent.tools.allow}
						<div class="mb-2">
							<span class="text-text-dim text-xs">Allowed:</span>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each agent.tools.allow as tool (tool)}
									<span
										class="bg-success-muted text-success rounded-md px-2 py-0.5 font-mono text-xs"
										>{tool}</span
									>
								{/each}
							</div>
						</div>
					{/if}
					{#if agent.tools.deny}
						<div>
							<span class="text-text-dim text-xs">Denied:</span>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each agent.tools.deny as tool (tool)}
									<span class="bg-danger-muted text-danger rounded-md px-2 py-0.5 font-mono text-xs"
										>{tool}</span
									>
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
						class="bg-accent hover:bg-accent-hover rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					{#if saveSuccess}
						<span class="text-success text-sm">Saved successfully</span>
					{/if}
					{#if saveError}
						<span class="text-danger text-sm">{saveError}</span>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
