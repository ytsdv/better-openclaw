<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';

	$effect(() => {
		if (!connection.isActive) goto('/connect');
	});

	let rawConfig = $state('');
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saveSuccess = $state(false);
	let initialized = $state(false);

	$effect(() => {
		if (connection.isConnected && connection.configRaw && !initialized) {
			initialized = true;
			rawConfig = connection.configRaw;
		}
	});

	async function refreshConfig() {
		loading = true;
		error = null;
		try {
			await connection.refreshConfig();
			rawConfig = connection.configRaw;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to refresh config';
		} finally {
			loading = false;
		}
	}

	async function applyConfig() {
		saving = true;
		error = null;
		saveSuccess = false;

		try {
			await connection.applyFullConfig(rawConfig);
			saveSuccess = true;
			setTimeout(() => (saveSuccess = false), 5000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to apply config';
		} finally {
			saving = false;
		}
	}

	const hasChanges = $derived(rawConfig !== connection.configRaw);
</script>

<div class="flex h-dvh flex-col overflow-hidden">
	<!-- Header -->
	<div class="shrink-0 border-b border-border bg-bg-raised px-8 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-lg font-bold text-text">Configuration</h1>
				<p class="text-xs text-text-dim font-mono">~/.openclaw/openclaw.json</p>
			</div>
			<div class="flex items-center gap-3">
				{#if saveSuccess}
					<span class="text-xs text-success">Applied + restarting gateway...</span>
				{/if}
				{#if error}
					<span class="max-w-sm truncate text-xs text-danger">{error}</span>
				{/if}
				<button
					onclick={refreshConfig}
					disabled={loading}
					class="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-50"
				>
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
				<button
					onclick={applyConfig}
					disabled={saving || !hasChanges}
					class="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-40 active:scale-[0.98]"
				>
					{saving ? 'Applying...' : 'Apply & Restart'}
				</button>
			</div>
		</div>
		{#if hasChanges}
			<div class="mt-2 text-xs text-warning">
				Config has been modified. Apply to save and restart the gateway.
			</div>
		{/if}
	</div>

	<!-- Editor -->
	<div class="flex-1 overflow-auto bg-bg">
		<textarea
			bind:value={rawConfig}
			class="h-full w-full resize-none bg-transparent px-8 py-6 text-sm leading-relaxed text-text outline-none font-mono"
			placeholder="Loading config..."
			spellcheck="false"
		></textarea>
	</div>
</div>
