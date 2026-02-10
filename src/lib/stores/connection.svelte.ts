import { GatewayWSClient } from '$lib/gateway/ws-client.js';
import { ToolsClient } from '$lib/gateway/tools-client.js';
import type { ConnectionStatus, OpenClawConfig } from '$lib/gateway/types.js';

const STORAGE_KEY_URL = 'openclaw-gateway-url';
const STORAGE_KEY_TOKEN = 'openclaw-gateway-token';

function createConnectionStore() {
	let gatewayUrl = $state('');
	let token = $state('');
	let status = $state<ConnectionStatus>('disconnected');
	let error = $state<string | null>(null);
	let config = $state<OpenClawConfig | null>(null);
	let configHash = $state<string>('');
	let configRaw = $state<string>('');
	let gatewayStatus = $state<Record<string, unknown> | null>(null);

	const wsClient = new GatewayWSClient();
	let toolsClient: ToolsClient | null = null;

	// Sync status from WS client
	wsClient.onStatusChange((s) => {
		status = s;
		if (s === 'connected') {
			error = null;
			refreshConfig();
			refreshStatus();
		}
	});

	// Load from localStorage and auto-connect
	if (typeof window !== 'undefined') {
		const storedUrl = localStorage.getItem(STORAGE_KEY_URL) ?? '';
		const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN) ?? '';
		gatewayUrl = storedUrl;
		token = storedToken;

		// Auto-reconnect if we have stored credentials
		if (storedUrl && storedToken) {
			toolsClient = new ToolsClient(wsClient);
			wsClient.connect(storedUrl, storedToken).catch((err) => {
				error = err instanceof Error ? err.message : String(err);
			});
		}
	}

	async function connect(url: string, tok: string): Promise<void> {
		gatewayUrl = url;
		token = tok;
		error = null;

		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY_URL, url);
			localStorage.setItem(STORAGE_KEY_TOKEN, tok);
		}

		toolsClient = new ToolsClient(wsClient);

		try {
			await wsClient.connect(url, tok);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			throw err;
		}
	}

	function disconnect() {
		wsClient.disconnect();
		config = null;
		configHash = '';
		configRaw = '';
		gatewayStatus = null;
		toolsClient = null;

		// Clear stored credentials on explicit disconnect
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY_URL);
			localStorage.removeItem(STORAGE_KEY_TOKEN);
		}
	}

	async function refreshConfig() {
		try {
			const result = await wsClient.getConfig();
			configRaw = result.raw;
			configHash = result.hash;
			try {
				config = JSON.parse(result.raw);
			} catch {
				const cleaned = result.raw
					.replace(/\/\/.*$/gm, '')
					.replace(/\/\*[\s\S]*?\*\//g, '')
					.replace(/,(\s*[}\]])/g, '$1');
				try {
					config = JSON.parse(cleaned);
				} catch {
					config = null;
				}
			}
		} catch (err) {
			console.error('Failed to refresh config:', err);
		}
	}

	async function refreshStatus() {
		try {
			gatewayStatus = await wsClient.getStatus();
		} catch (err) {
			console.error('Failed to refresh status:', err);
		}
	}

	async function patchConfig(patch: string): Promise<void> {
		await wsClient.patchConfig(patch, configHash);
		await refreshConfig();
	}

	async function applyFullConfig(raw: string): Promise<void> {
		await wsClient.applyConfig(raw, configHash);
		await refreshConfig();
	}

	function getToolsClient(): ToolsClient {
		if (!toolsClient) {
			throw new Error('Not connected - no tools client available');
		}
		return toolsClient;
	}

	return {
		get gatewayUrl() {
			return gatewayUrl;
		},
		get token() {
			return token;
		},
		get status() {
			return status;
		},
		get error() {
			return error;
		},
		get config() {
			return config;
		},
		get configHash() {
			return configHash;
		},
		get configRaw() {
			return configRaw;
		},
		get gatewayStatus() {
			return gatewayStatus;
		},
		get wsClient() {
			return wsClient;
		},
		get isConnected() {
			return status === 'connected';
		},
		/** True when connected OR auto-reconnecting after a brief disconnect */
		get isActive() {
			return status === 'connected' || status === 'reconnecting';
		},
		connect,
		disconnect,
		refreshConfig,
		refreshStatus,
		patchConfig,
		applyFullConfig,
		getToolsClient
	};
}

export const connection = createConnectionStore();
