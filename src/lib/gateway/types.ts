// OpenClaw Gateway Protocol Types

export interface GatewayRequest {
	type: 'req';
	id: string;
	method: string;
	params: Record<string, unknown>;
}

export interface GatewayResponse {
	type: 'res';
	id: string;
	ok: boolean;
	payload?: Record<string, unknown>;
	error?: { type: string; message: string };
}

export interface GatewayEvent {
	type: 'event';
	event: string;
	payload?: Record<string, unknown>;
	seq?: number;
	stateVersion?: number;
}

export type GatewayFrame = GatewayResponse | GatewayEvent;

export interface ConnectParams {
	minProtocol: number;
	maxProtocol: number;
	client: {
		id: string;
		version: string;
		platform: string;
		mode: string;
	};
	role: string;
	scopes: string[];
	caps: string[];
	commands: string[];
	permissions: Record<string, boolean>;
	auth: { token: string };
	locale?: string;
	userAgent?: string;
}

export interface AgentIdentity {
	name?: string;
	theme?: string;
	emoji?: string;
	avatar?: string;
}

export interface AgentConfig {
	id: string;
	default?: boolean;
	name?: string;
	workspace?: string;
	agentDir?: string;
	model?: string | { primary: string; fallbacks?: string[] };
	identity?: AgentIdentity;
	groupChat?: {
		mentionPatterns?: string[];
	};
	sandbox?: {
		mode?: 'off' | 'non-main' | 'all';
		scope?: 'session' | 'agent' | 'shared';
		workspaceAccess?: 'none' | 'ro' | 'rw';
		workspaceRoot?: string;
	};
	tools?: {
		profile?: string;
		allow?: string[];
		deny?: string[];
	};
}

export interface Binding {
	agentId: string;
	match: {
		channel: string;
		accountId?: string;
		peer?: { kind: string; id: string };
		guildId?: string;
		teamId?: string;
	};
}

export interface OpenClawConfig {
	agents?: {
		defaults?: {
			workspace?: string;
			model?: string | { primary: string; fallbacks?: string[] };
			sandbox?: Record<string, unknown>;
			[key: string]: unknown;
		};
		list?: AgentConfig[];
	};
	bindings?: Binding[];
	channels?: Record<string, unknown>;
	messages?: Record<string, unknown>;
	gateway?: Record<string, unknown>;
	tools?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface ConfigGetResult {
	raw: string;
	hash: string;
	parsed?: OpenClawConfig;
}

export interface AgentFileEntry {
	name: string;
	path: string;
	missing: boolean;
	size?: number;
	updatedAtMs?: number;
	content?: string;
}

export interface AgentFilesListResult {
	agentId: string;
	workspace: string;
	files: AgentFileEntry[];
}

export interface AgentFileGetResult {
	agentId: string;
	workspace: string;
	file: AgentFileEntry;
}

export interface AgentFileSetResult {
	ok: boolean;
	agentId: string;
	workspace: string;
	file: AgentFileEntry;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'reconnecting' | 'connected' | 'error';
