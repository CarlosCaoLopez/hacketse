# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackETSE is a P2P distributed computing network that converts old phones into compute nodes. The system uses WebRTC for peer-to-peer connections with a WebSocket signaling server for peer discovery. User code executes in isolated Web Workers for basic sandboxing.

## Repository Structure

The project consists of two main TypeScript applications:

- **signaling-server/**: WebSocket signaling server (Node.js) that facilitates peer discovery and WebRTC signal exchange
- **peer-node/**: Capacitor-based mobile/web application that functions as a P2P compute node

## Development Commands

### Signaling Server (signaling-server/)

Build and run:
```bash
cd signaling-server
npm install
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled server
```

Development with auto-reload:
```bash
npm run dev      # Run with ts-node (no build step)
```

Server listens on http://localhost:3000 by default (configurable via PORT environment variable).

### Peer Node (peer-node/)

Install and build:
```bash
cd peer-node
npm install
npm run build    # Compile TypeScript once to www/dist/
npm run watch    # Compile in watch mode with auto-recompilation
```

Run in browser (development):
1. Ensure signaling server is running
2. Build TypeScript (see above)
3. Open `www/index.html` in a browser

Mobile deployment (Capacitor):
```bash
npx cap init              # First time only
npx cap add android       # Add Android platform
npx cap sync              # Sync web code to native projects
npx cap open android      # Open in Android Studio
```

For iOS: replace `android` with `ios` in the above commands.

## Architecture

### Communication Flow

1. **Peer Registration**: Nodes connect to the signaling server via WebSocket and register with a unique peer ID (format: `peer-xxxxxxxxx`)
2. **WebRTC Signaling**: Signaling server relays WebRTC signals between peers to establish P2P connections
3. **P2P Task Execution**: Once connected, peers send task messages containing JavaScript code to be executed
4. **Worker Isolation**: Receiving node forwards code to Web Worker for isolated execution
5. **Result Return**: Worker results are sent back to the requesting peer via the P2P connection

### Message Protocol

The system uses JSON messages over WebSocket (signaling) and WebRTC data channels (P2P):

**Signaling Server Messages:**
- `register`: Client registers with a peer ID
- `signal`: WebRTC signal exchange (ICE candidates, SDP)
- `registered`: Server confirms registration
- `error`: Server reports errors

**P2P Messages:**
- `task`: Contains `taskId` and `code` (JavaScript function as string)
- `result`: Contains `taskId`, `result` data, and optional `error`

### TypeScript Configuration

**Signaling Server** (signaling-server/tsconfig.json):
- Target: ES2020
- Module: CommonJS (Node.js)
- Output: dist/
- Strict mode enabled

**Peer Node** (peer-node/tsconfig.json):
- Target: ES2020
- Module: ES2020 (browser/bundler)
- Output: www/dist/
- DOM libraries included
- Strict mode enabled

### Key Files

- [signaling-server/src/server.ts](signaling-server/src/server.ts): WebSocket server implementing peer registry and signal relay
- [peer-node/src/peer-node.ts](peer-node/src/peer-node.ts): Main P2P node logic - handles signaling, WebRTC connections, and task coordination
- [peer-node/src/worker-sandbox.ts](peer-node/src/worker-sandbox.ts): Web Worker that executes user code in isolation
- [peer-node/www/index.html](peer-node/www/index.html): UI for the peer node application

### Dependencies

**Signaling Server:**
- express: HTTP server
- ws: WebSocket implementation

**Peer Node:**
- simple-peer: WebRTC wrapper for P2P connections
- @capacitor/core: Mobile app framework

## Important Notes

### Security Warning

This is a hackathon prototype with **basic sandboxing only**. The worker-sandbox uses `new Function()` which provides limited isolation. For production use, the following security measures are required:

- Use robust sandboxing (e.g., isolated-vm, containers)
- Implement execution time limits
- Add memory restrictions
- Whitelist allowed APIs
- Add peer authentication and authorization
- Implement end-to-end encryption
- Add rate limiting and code validation

### Current Limitations

- The target peer ID in [peer-node.ts:178](peer-node/src/peer-node.ts#L178) is hardcoded as `'otro-peer-id'` - this should come from the UI or a peer discovery mechanism
- No task client implementation exists yet to submit work to the network
- No load balancing or task distribution system
- No persistence of results
- No metrics or monitoring

### Testing Strategy

Currently no automated tests exist. When testing manually:

1. Start signaling server first
2. Open multiple peer-node instances in different browser tabs/devices
3. Manually modify the target peer ID to connect specific peers
4. Test task execution by sending messages via browser console

Example task submission (from browser console with an established P2P connection):
```javascript
peer.send(JSON.stringify({
  type: 'task',
  taskId: 'test-123',
  code: 'function() { return 2 + 2; }'
}));
```
