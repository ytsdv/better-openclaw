<script lang="ts">
	import '../app.css';
	import { connection } from '$lib/stores/connection.svelte.js';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	let { children }: { children: Snippet } = $props();

	const isConnectPage = $derived(page.url.pathname.startsWith('/connect'));
</script>

{#if connection.isActive && !isConnectPage}
	<div class="flex h-dvh overflow-hidden">
		<Sidebar />
		<main class="relative flex-1 overflow-y-auto">
			{#if connection.status === 'reconnecting'}
				<div
					class="bg-warning-muted text-warning absolute inset-x-0 top-0 z-50 flex items-center justify-center px-4 py-2 text-xs"
				>
					<svg class="mr-2 h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Reconnecting to gateway...
				</div>
			{/if}
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}
