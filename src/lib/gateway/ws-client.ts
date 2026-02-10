import type {
	GatewayRequest,
	GatewayResponse,
	GatewayEvent,
	GatewayFrame,
	ConnectParams,
	ConnectionStatus,
	ConfigGetResult
} from './types.js';

type RequestResolver = {
	resolve: (value: GatewayResponse) => void;
	reject: (reason: Error) => void;
	timeout: ReturnType<typeof setTimeout>;
};

type EventHandler = (event: GatewayEvent) => void;

export class GatewayWSClient {
	private ws: WebSocket | null = null;
	private requestId = 0;
	private pendingRequests = new Map<string, RequestResolver>();
	private eventHandlers = new Map<string, Set<EventHandler>>();
	private _status: ConnectionStatus = 'disconnected';
	private statusListeners = new Set<(status: ConnectionStatus) => void>();
	private gatewayUrl: string = '';
	private token: string = '';
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private challengeNonce: string | null = null;
	private challengeFallbackTimer: ReturnType<typeof setTimeout> | null = null;
	private wasEverConnected = false;

	get status(): ConnectionStatus {
		return this._status;
	}

	private setStatus(status: ConnectionStatus) {
		this._status = status;
		for (const listener of this.statusListeners) {
			listener(status);
		}
	}

	onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
		this.statusListeners.add(listener);
		return () => this.statusListeners.delete(listener);
	}

	on(event: string, handler: EventHandler): () => void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, new Set());
		}
		this.eventHandlers.get(event)!.add(handler);
		return () => this.eventHandlers.get(event)?.delete(handler);
	}

	async connect(gatewayUrl: string, token: string): Promise<void> {
		this.gatewayUrl = gatewayUrl;
		this.token = token;
		this.challengeNonce = null;

		if (this.challengeFallbackTimer) {
			clearTimeout(this.challengeFallbackTimer);
			this.challengeFallbackTimer = null;
		}

		if (this.ws) {
			this.ws.onclose = null; // Prevent old socket from triggering reconnect
			this.ws.close();
			this.ws = null;
		}

		// Use 'reconnecting' if we've been connected before (e.g. gateway restart)
		const connectingStatus = this.wasEverConnected ? 'reconnecting' : 'connecting';
		this.setStatus(connectingStatus);

		return new Promise((resolve, reject) => {
			let wsUrl = gatewayUrl;
			if (wsUrl.startsWith('http://')) {
				wsUrl = 'ws://' + wsUrl.slice(7);
			} else if (wsUrl.startsWith('https://')) {
				wsUrl = 'wss://' + wsUrl.slice(8);
			} else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
				wsUrl = 'ws://' + wsUrl;
			}
			wsUrl = wsUrl.replace(/\/+$/, '');

			try {
				this.ws = new WebSocket(wsUrl);
			} catch (err) {
				this.setStatus('error');
				reject(new Error(`Failed to create WebSocket: ${err}`));
				return;
			}

			let connected = false;

			this.ws.onopen = () => {
				// Wait for the challenge event or send connect after timeout
			};

			this.ws.onmessage = (event) => {
				let frame: GatewayFrame;
				try {
					frame = JSON.parse(event.data as string);
				} catch {
					return;
				}

				// Handle challenge event
				if (frame.type === 'event' && (frame as GatewayEvent).event === 'connect.challenge') {
					this.challengeNonce = ((frame as GatewayEvent).payload?.nonce as string) ?? null;
					// Cancel the fallback timer since we got the challenge
					if (this.challengeFallbackTimer) {
						clearTimeout(this.challengeFallbackTimer);
						this.challengeFallbackTimer = null;
					}
					this.sendConnectHandshake();
					return;
				}

				if (frame.type === 'res') {
					const resp = frame as GatewayResponse;

					// Handle connect response
					if (!connected && resp.id === 'connect-1') {
						if (resp.ok) {
							connected = true;
							this.wasEverConnected = true;
							this.setStatus('connected');
							resolve();
						} else {
							this.setStatus('error');
							reject(new Error(resp.error?.message ?? 'Connection rejected'));
						}
						return;
					}

					// Handle pending requests
					const pending = this.pendingRequests.get(resp.id);
					if (pending) {
						clearTimeout(pending.timeout);
						this.pendingRequests.delete(resp.id);
						pending.resolve(resp);
					}
				} else if (frame.type === 'event') {
					const evt = frame as GatewayEvent;
					const handlers = this.eventHandlers.get(evt.event);
					if (handlers) {
						for (const handler of handlers) {
							handler(evt);
						}
					}
					const wildcardHandlers = this.eventHandlers.get('*');
					if (wildcardHandlers) {
						for (const handler of wildcardHandlers) {
							handler(evt);
						}
					}
				}
			};

			this.ws.onerror = () => {
				if (!connected) {
					this.setStatus('error');
					reject(new Error('WebSocket connection failed'));
				}
			};

			this.ws.onclose = () => {
				const wasConnected = connected;
				connected = false;

				// Clean up pending requests
				for (const [id, pending] of this.pendingRequests) {
					clearTimeout(pending.timeout);
					pending.reject(new Error('WebSocket closed'));
					this.pendingRequests.delete(id);
				}

				// If we were connected, attempt auto-reconnect
				if (wasConnected && this.gatewayUrl && this.token) {
					this.setStatus('reconnecting');
					this.scheduleReconnect();
				} else if (this._status !== 'error') {
					this.setStatus('disconnected');
				}
			};

			// Fallback: if no challenge arrives within 3 seconds, try connecting directly
			this.challengeFallbackTimer = setTimeout(() => {
				this.challengeFallbackTimer = null;
				if (!connected && this.ws?.readyState === WebSocket.OPEN) {
					this.sendConnectHandshake();
				}
			}, 3000);
		});
	}

	private sendConnectHandshake() {
		const params: ConnectParams = {
			minProtocol: 3,
			maxProtocol: 3,
			client: {
				id: 'openclaw-control-ui',
				version: '1.0.0',
				platform: navigator.platform ?? 'web',
				mode: 'webchat'
			},
			role: 'operator',
			scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
			caps: [],
			commands: [],
			permissions: {},
			auth: { token: this.token },
			locale: navigator.language,
			userAgent: navigator.userAgent
		};

		const req: GatewayRequest = {
			type: 'req',
			id: 'connect-1',
			method: 'connect',
			params: params as unknown as Record<string, unknown>
		};

		this.ws?.send(JSON.stringify(req));
	}

	private scheduleReconnect() {
		if (this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			if (this.gatewayUrl && this.token) {
				this.connect(this.gatewayUrl, this.token).catch(() => {
					// Will retry on next close
				});
			}
		}, 3000);
	}

	async request(method: string, params: Record<string, unknown> = {}): Promise<GatewayResponse> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('Not connected to gateway');
		}

		const id = `req-${++this.requestId}`;
		const req: GatewayRequest = { type: 'req', id, method, params };

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Request ${method} timed out`));
			}, 30000);

			this.pendingRequests.set(id, { resolve, reject, timeout });
			this.ws!.send(JSON.stringify(req));
		});
	}

	async getConfig(): Promise<ConfigGetResult> {
		const resp = await this.request('config.get', {});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to get config');
		return resp.payload as unknown as ConfigGetResult;
	}

	async patchConfig(raw: string, baseHash: string): Promise<void> {
		const resp = await this.request('config.patch', {
			raw,
			baseHash,
			restartDelayMs: 2000
		});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to patch config');
	}

	async setConfig(raw: string, baseHash: string): Promise<void> {
		const resp = await this.request('config.set', {
			raw,
			baseHash
		});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to set config');
	}

	async applyConfig(raw: string, baseHash: string): Promise<void> {
		const resp = await this.request('config.apply', {
			raw,
			baseHash,
			restartDelayMs: 2000
		});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to apply config');
	}

	async getStatus(): Promise<Record<string, unknown>> {
		const resp = await this.request('status', {});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to get status');
		return resp.payload ?? {};
	}

	async getHealth(): Promise<Record<string, unknown>> {
		const resp = await this.request('health', {});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to get health');
		return resp.payload ?? {};
	}

	async getSessions(): Promise<Record<string, unknown>> {
		const resp = await this.request('sessions.list', {});
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to list sessions');
		return resp.payload ?? {};
	}

	disconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.challengeFallbackTimer) {
			clearTimeout(this.challengeFallbackTimer);
			this.challengeFallbackTimer = null;
		}
		this.wasEverConnected = false;
		if (this.ws) {
			this.ws.onclose = null; // Prevent reconnect on explicit disconnect
			this.ws.close();
			this.ws = null;
		}
		this.setStatus('disconnected');
	}
}
