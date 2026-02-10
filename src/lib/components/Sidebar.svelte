<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const nav = [
		{
			href: '/',
			label: 'Dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			href: '/agents',
			label: 'Agents',
			icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
		},
		{
			href: '/config',
			label: 'Config',
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
		}
	] as const;

	const isReconnecting = $derived(connection.status === 'reconnecting');

	function handleDisconnect() {
		connection.disconnect();
		goto(resolve('/connect'));
	}
</script>

<aside class="border-border bg-bg-raised flex w-60 flex-col border-r">
	<div class="border-border flex items-center gap-3 border-b px-5 py-4">
		<div
			class="bg-accent-muted text-accent flex h-8 w-8 items-center justify-center rounded-lg text-lg"
		>
			C
		</div>
		<div>
			<div class="text-text text-sm font-semibold">ClawdBot</div>
			<div class="text-text-dim text-xs">OpenClaw Manager</div>
		</div>
	</div>

	<nav class="flex-1 space-y-0.5 px-3 py-4">
		{#each nav as item (item.href)}
			<a
				href={resolve(item.href)}
				class="text-text-muted hover:bg-bg-hover hover:text-text flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
			>
				<svg
					class="h-4 w-4 shrink-0"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
				</svg>
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="border-border border-t px-3 py-3">
		<div class="mb-2 flex items-center gap-2 px-3">
			{#if isReconnecting}
				<div class="bg-warning h-2 w-2 animate-pulse rounded-full"></div>
			{:else}
				<div
					class="h-2 w-2 rounded-full"
					class:bg-success={connection.isConnected}
					class:bg-danger={!connection.isConnected}
				></div>
			{/if}
			<span class="text-text-dim truncate text-xs">
				{#if isReconnecting}
					Reconnecting...
				{:else}
					{connection.gatewayUrl || 'Not connected'}
				{/if}
			</span>
		</div>
		<button
			onclick={handleDisconnect}
			class="text-text-muted hover:bg-danger-muted hover:text-danger flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
				/>
			</svg>
			Disconnect
		</button>
	</div>
</aside>
