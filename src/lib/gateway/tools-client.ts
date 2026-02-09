/**
 * Tools client that uses WebSocket agents.files.* methods for
 * reading and writing agent workspace and memory files.
 */
import type { GatewayWSClient } from './ws-client.js';
import type {
	AgentFileEntry,
	AgentFilesListResult,
	AgentFileGetResult,
	AgentFileSetResult
} from './types.js';

export class ToolsClient {
	constructor(private ws: GatewayWSClient) {}

	/**
	 * List all files for an agent (workspace bootstrap files).
	 */
	async listFiles(agentId: string): Promise<AgentFileEntry[]> {
		const resp = await this.ws.request('agents.files.list', { agentId });
		if (!resp.ok) throw new Error(resp.error?.message ?? 'Failed to list files');
		const result = resp.payload as unknown as AgentFilesListResult;
		return result.files;
	}

	/**
	 * Get a single file by name for an agent.
	 * Returns the file entry with content populated.
	 */
	async getFile(agentId: string, name: string): Promise<AgentFileEntry> {
		const resp = await this.ws.request('agents.files.get', { agentId, name });
		if (!resp.ok) throw new Error(resp.error?.message ?? `Failed to get file: ${name}`);
		const result = resp.payload as unknown as AgentFileGetResult;
		return result.file;
	}

	/**
	 * Read file content for an agent. Returns empty string if file is missing.
	 */
	async readFile(agentId: string, name: string): Promise<string> {
		const file = await this.getFile(agentId, name);
		if (file.missing) return '';
		return file.content ?? '';
	}

	/**
	 * Set (create or update) a file for an agent.
	 */
	async setFile(agentId: string, name: string, content: string): Promise<AgentFileEntry> {
		const resp = await this.ws.request('agents.files.set', { agentId, name, content });
		if (!resp.ok) throw new Error(resp.error?.message ?? `Failed to save file: ${name}`);
		const result = resp.payload as unknown as AgentFileSetResult;
		return result.file;
	}

	/**
	 * List workspace bootstrap files that exist for an agent.
	 * Returns file names (not full paths).
	 */
	async listWorkspaceFiles(agentId: string): Promise<string[]> {
		const files = await this.listFiles(agentId);
		return files.filter((f) => !f.missing).map((f) => f.name);
	}

	/**
	 * List all files including missing ones (to show which can be created).
	 */
	async listAllFiles(agentId: string): Promise<AgentFileEntry[]> {
		return this.listFiles(agentId);
	}
}
