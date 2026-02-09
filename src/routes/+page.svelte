<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import type { AgentConfig } from '$lib/gateway/types.js';

	// Redirect to connect if not connected (but allow reconnecting state)
	$effect(() => {
		if (!connection.isActive) {
			goto('/connect');
		}
	});

	const agents = $derived<AgentConfig[]>(connection.config?.agents?.list ?? []);
	const defaultWorkspace = $derived(connection.config?.agents?.defaults?.workspace ?? '~/.openclaw/workspace');

	const channelNames = $derived(() => {
		const channels = connection.config?.channels;
		if (!channels || typeof channels !== 'object') return [] as string[];
		return Object.keys(channels);
	});

	// Pull some useful info from status
	const statusData = $derived(connection.gatewayStatus);
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-text">Dashboard</h1>
		<p class="mt-1 text-sm text-text-muted">Gateway overview and agent status</p>
	</div>

	<!-- Status cards -->
	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Connection status -->
		<div class="rounded-xl border border-border bg-bg-raised p-5">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-text-dim">Status</span>
				<div class="h-2.5 w-2.5 rounded-full bg-success shadow-sm shadow-success/50"></div>
			</div>
			<div class="text-lg font-semibold text-success">Connected</div>
			<div class="mt-1 truncate text-xs text-text-dim font-mono">{connection.gatewayUrl}</div>
		</div>

		<!-- Agent count -->
		<div class="rounded-xl border border-border bg-bg-raised p-5">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-text-dim">Agents</span>
				<svg class="h-4 w-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</div>
			<div class="text-lg font-semibold text-text">{agents.length || 1}</div>
			<div class="mt-1 text-xs text-text-dim">
				{agents.length > 0 ? `${agents.length} configured` : 'Default agent (main)'}
			</div>
		</div>

		<!-- Workspace -->
		<div class="rounded-xl border border-border bg-bg-raised p-5">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-text-dim">Workspace</span>
				<svg class="h-4 w-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
			</div>
			<div class="truncate text-sm font-semibold text-text font-mono">{defaultWorkspace}</div>
			<div class="mt-1 text-xs text-text-dim">Default workspace path</div>
		</div>

		<!-- Channels -->
		<div class="rounded-xl border border-border bg-bg-raised p-5">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-xs font-medium uppercase tracking-wider text-text-dim">Channels</span>
				<svg class="h-4 w-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
			</div>
			<div class="text-lg font-semibold text-text">{channelNames().length}</div>
			<div class="mt-1 text-xs text-text-dim">
				{channelNames().length > 0 ? channelNames().join(', ') : 'No channels configured'}
			</div>
		</div>
	</div>

	<!-- Agents quick list -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-text">Agents</h2>
			<a href="/agents" class="text-sm text-accent transition-colors hover:text-accent-hover">
				Manage agents &rarr;
			</a>
		</div>

		{#if agents.length === 0}
			<div class="rounded-xl border border-border-subtle bg-bg-raised p-6">
				<div class="flex items-center gap-4">
					<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-xl">
						M
					</div>
					<div>
						<div class="font-semibold text-text">main</div>
						<div class="text-sm text-text-muted">Default agent</div>
						<div class="mt-0.5 truncate text-xs text-text-dim font-mono">{defaultWorkspace}</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each agents as agent}
					<a
						href="/agents/{agent.id}"
						class="group rounded-xl border border-border-subtle bg-bg-raised p-5 transition-all hover:border-border hover:bg-bg-hover"
					>
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted text-lg transition-transform group-hover:scale-105">
								{agent.identity?.emoji ?? agent.id.charAt(0).toUpperCase()}
							</div>
							<div class="min-w-0 flex-1">
								<div class="font-semibold text-text">{agent.identity?.name ?? agent.id}</div>
								<div class="text-xs text-text-dim">{agent.id}</div>
							</div>
							{#if agent.default}
								<span class="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">default</span>
							{/if}
						</div>
						{#if agent.workspace}
							<div class="mt-3 truncate text-xs text-text-dim font-mono">{agent.workspace}</div>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Raw status data -->
	{#if statusData}
		<div>
			<h2 class="mb-4 text-lg font-semibold text-text">Gateway Status</h2>
			<div class="rounded-xl border border-border bg-bg-raised p-5">
				<pre class="overflow-x-auto text-xs text-text-muted font-mono leading-relaxed">{JSON.stringify(statusData, null, 2)}</pre>
			</div>
		</div>
	{/if}
</div>
