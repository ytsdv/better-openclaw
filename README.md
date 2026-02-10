# better-openclaw

A web-based control panel for managing [OpenClaw](https://openclaw.ai) AI agents. Connect to your gateway, configure agents, edit their workspace files and memory, and manage your raw gateway config -- all from the browser.

## What it does

better-openclaw connects to your running OpenClaw gateway over WebSocket and gives you a clean UI to:

- **View gateway status** -- see connected agents, sessions, health, and configuration at a glance
- **Manage agents** -- create, configure, and delete agents. Upload workspace files during agent creation via drag-and-drop
- **Edit workspace files** -- SOUL.md, AGENTS.md, USER.md, IDENTITY.md, TOOLS.md, HEARTBEAT.md, BOOT.md, BOOTSTRAP.md
- **Browse and edit memory** -- view MEMORY.md and daily memory logs, edit them in place
- **Edit raw gateway config** -- modify `openclaw.json` directly and apply changes with a gateway restart

## Tech stack

SvelteKit (Svelte 5) with TypeScript, Tailwind CSS v4, and Vite. Builds to a static site you can serve from anywhere.

## Getting started

### Prerequisites

- Node.js 22+
- A running OpenClaw gateway

### Install

```sh
npm install
```

### Configure your gateway

Before the UI can connect, you need to whitelist its origin in your gateway config. Add the following to `openclaw.json`:

```jsonc
{
	"gateway": {
		"controlUi": {
			"allowedOrigins": ["http://localhost:5173"]
		}
	}
}
```

Replace `http://localhost:5173` with whatever origin you're actually serving the UI from in production.

### Development

```sh
npm run dev
```

Opens on `http://localhost:5173` by default. Enter your gateway URL and auth token on the connect page.

### Build

```sh
npm run build
```

Outputs a static site to `build/`. Serve it with any static file server, or use the included Docker setup.

### Docker

```sh
docker compose up -d
```

Serves the UI on port 8103 via Nginx.

## Scripts

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Start dev server                      |
| `npm run build`   | Production build                      |
| `npm run preview` | Preview the production build locally  |
| `npm run check`   | Run TypeScript and Svelte type checks |
| `npm run lint`    | Run ESLint                            |
| `npm run format`  | Format code with Prettier             |

## Project structure

```
src/
  lib/
    gateway/       # WebSocket client and typed API for talking to the gateway
    stores/        # Svelte 5 reactive stores (connection state, auto-reconnect)
    components/    # Shared UI components (sidebar, etc.)
  routes/
    connect/       # Login page -- gateway URL + auth token
    agents/        # Agent list, individual agent config, workspace editor, memory viewer
    config/        # Raw openclaw.json editor
```

## How it works

The UI authenticates with the gateway using a challenge-based WebSocket handshake (protocol v3, operator role). Credentials are stored in `localStorage` so you stay connected across page reloads. If the connection drops, it auto-reconnects every 3 seconds.

All configuration changes (adding agents, editing settings, applying config) go through `config.patch` and `config.apply` WebSocket calls. File reads and writes use the `agents.files.*` API.
