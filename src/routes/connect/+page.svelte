<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

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
			goto(resolve('/'));
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
			goto(resolve('/'));
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Connection failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="bg-bg flex min-h-dvh items-center justify-center p-4">
	<!-- Background decoration -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div class="bg-accent/5 absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl"></div>
		<div class="bg-accent/3 absolute -bottom-40 -left-40 h-96 w-96 rounded-full blur-3xl"></div>
	</div>

	<div class="relative w-full max-w-md">
		<!-- Logo area -->
		<div class="mb-8 text-center">
			<div
				class="border-border bg-bg-raised text-accent shadow-accent/5 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl font-bold shadow-lg"
			>
				C
			</div>
			<h1 class="text-text text-2xl font-bold tracking-tight">ClawdBot</h1>
			<p class="text-text-dim mt-1 text-sm">OpenClaw Management Interface</p>
		</div>

		<!-- Connection form -->
		<form
			onsubmit={handleConnect}
			class="border-border bg-bg-raised space-y-5 rounded-2xl border p-6 shadow-xl shadow-black/20"
		>
			<div>
				<label
					for="gateway-url"
					class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
				>
					Gateway URL
				</label>
				<input
					id="gateway-url"
					type="text"
					bind:value={url}
					placeholder="http://127.0.0.1:18789"
					class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 focus:ring-accent/25 w-full rounded-lg border px-3.5 py-2.5 font-mono text-sm transition-colors outline-none focus:ring-1"
				/>
				<p class="text-text-dim mt-1.5 text-xs">WebSocket or HTTP URL of your OpenClaw gateway</p>
			</div>

			<div>
				<label
					for="gateway-token"
					class="text-text-dim mb-1.5 block text-xs font-medium tracking-wider uppercase"
				>
					Auth Token
				</label>
				<input
					id="gateway-token"
					type="password"
					bind:value={token}
					placeholder="OPENCLAW_GATEWAY_TOKEN"
					class="border-border bg-bg-surface text-text placeholder-text-dim focus:border-accent/50 focus:ring-accent/25 w-full rounded-lg border px-3.5 py-2.5 font-mono text-sm transition-colors outline-none focus:ring-1"
				/>
				<p class="text-text-dim mt-1.5 text-xs">
					Your <code class="bg-bg-surface text-accent rounded px-1 py-0.5"
						>OPENCLAW_GATEWAY_TOKEN</code
					>
				</p>
			</div>

			{#if errorMsg}
				<div
					class="border-danger/20 bg-danger-muted text-danger rounded-lg border px-3.5 py-2.5 text-sm"
				>
					{errorMsg}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading || autoConnecting}
				class="bg-accent hover:bg-accent-hover w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if loading || autoConnecting}
					<span class="inline-flex items-center gap-2">
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						{autoConnecting && !loading ? 'Auto-connecting...' : 'Connecting...'}
					</span>
				{:else}
					Connect to Gateway
				{/if}
			</button>
		</form>

		<p class="text-text-dim mt-6 text-center text-xs">
			Connects via WebSocket to your OpenClaw gateway
		</p>
	</div>
</div>
