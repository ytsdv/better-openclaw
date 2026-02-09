<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';

	let url = $state(connection.gatewayUrl || 'http://127.0.0.1:18789');
	let token = $state(connection.token || '');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	const autoConnecting = $derived(
		connection.status === 'connecting' || connection.status === 'reconnecting'
	);

	// Auto-redirect if already connected (e.g. auto-reconnect succeeded)
	$effect(() => {
		if (connection.isConnected) {
			goto('/');
		}
	});

	// Show auto-connect errors
	$effect(() => {
		if (connection.error && !loading) {
			errorMsg = connection.error;
		}
	});

	async function handleConnect(e: Event) {
		e.preventDefault();
		if (!url || !token) {
			errorMsg = 'Both gateway URL and token are required';
			return;
		}

		loading = true;
		errorMsg = null;

		try {
			await connection.connect(url, token);
			goto('/');
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Connection failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-dvh items-center justify-center bg-bg p-4">
	<!-- Background decoration -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl"></div>
		<div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/3 blur-3xl"></div>
	</div>

	<div class="relative w-full max-w-md">
		<!-- Logo area -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg-raised text-2xl font-bold text-accent shadow-lg shadow-accent/5">
				C
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-text">ClawdBot</h1>
			<p class="mt-1 text-sm text-text-dim">OpenClaw Management Interface</p>
		</div>

		<!-- Connection form -->
		<form
			onsubmit={handleConnect}
			class="space-y-5 rounded-2xl border border-border bg-bg-raised p-6 shadow-xl shadow-black/20"
		>
			<div>
				<label for="gateway-url" class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">
					Gateway URL
				</label>
				<input
					id="gateway-url"
					type="text"
					bind:value={url}
					placeholder="http://127.0.0.1:18789"
					class="w-full rounded-lg border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-text placeholder-text-dim outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/25 font-mono"
				/>
				<p class="mt-1.5 text-xs text-text-dim">
					WebSocket or HTTP URL of your OpenClaw gateway
				</p>
			</div>

			<div>
				<label for="gateway-token" class="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">
					Auth Token
				</label>
				<input
					id="gateway-token"
					type="password"
					bind:value={token}
					placeholder="OPENCLAW_GATEWAY_TOKEN"
					class="w-full rounded-lg border border-border bg-bg-surface px-3.5 py-2.5 text-sm text-text placeholder-text-dim outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/25 font-mono"
				/>
				<p class="mt-1.5 text-xs text-text-dim">
					Your <code class="rounded bg-bg-surface px-1 py-0.5 text-accent">OPENCLAW_GATEWAY_TOKEN</code>
				</p>
			</div>

			{#if errorMsg}
				<div class="rounded-lg border border-danger/20 bg-danger-muted px-3.5 py-2.5 text-sm text-danger">
					{errorMsg}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading || autoConnecting}
				class="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
			>
				{#if loading || autoConnecting}
					<span class="inline-flex items-center gap-2">
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						{autoConnecting && !loading ? 'Auto-connecting...' : 'Connecting...'}
					</span>
				{:else}
					Connect to Gateway
				{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-xs text-text-dim">
			Connects via WebSocket to your OpenClaw gateway
		</p>
	</div>
</div>
