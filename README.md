# better-clawdbot

A web-based control UI for managing OpenClaw AI agents, workspace files, and memory.

## Setup

Install dependencies:

```sh
npm install
```

### Gateway Configuration

Before connecting, you must allow this UI's origin in your OpenClaw gateway config. Add the URL where this UI is hosted to `gateway.controlUi.allowedOrigins` in your `openclaw.json`:

```jsonc
{
  "gateway": {
    "controlUi": {
      "allowedOrigins": ["http://localhost:5173"]
    }
  }
}
```

For production, replace `http://localhost:5173` with the actual origin where the UI is served.

## Developing

```sh
npm run dev
```

## Building

```sh
npm run build
```

The build output is a static site in `build/`. Serve it with any static file server.
