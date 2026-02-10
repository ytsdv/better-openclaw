<script lang="ts">
	import { connection } from '$lib/stores/connection.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	$effect(() => {
		if (!connection.isActive) goto(resolve('/connect'));
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
	<div class="border-border bg-bg-raised shrink-0 border-b px-8 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-text text-lg font-bold">Configuration</h1>
				<p class="text-text-dim font-mono text-xs">~/.openclaw/openclaw.json</p>
			</div>
			<div class="flex items-center gap-3">
				{#if saveSuccess}
					<span class="text-success text-xs">Applied + restarting gateway...</span>
				{/if}
				{#if error}
					<span class="text-danger max-w-sm truncate text-xs">{error}</span>
				{/if}
				<button
					onclick={refreshConfig}
					disabled={loading}
					class="border-border text-text-muted hover:bg-bg-hover hover:text-text rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
				>
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
				<button
					onclick={applyConfig}
					disabled={saving || !hasChanges}
					class="bg-accent hover:bg-accent-hover rounded-md px-4 py-1.5 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
				>
					{saving ? 'Applying...' : 'Apply & Restart'}
				</button>
			</div>
		</div>
		{#if hasChanges}
			<div class="text-warning mt-2 text-xs">
				Config has been modified. Apply to save and restart the gateway.
			</div>
		{/if}
	</div>

	<!-- Editor -->
	<div class="bg-bg flex-1 overflow-auto">
		<textarea
			bind:value={rawConfig}
			class="text-text h-full w-full resize-none bg-transparent px-8 py-6 font-mono text-sm leading-relaxed outline-none"
			placeholder="Loading config..."
			spellcheck="false"
		></textarea>
	</div>
</div>
