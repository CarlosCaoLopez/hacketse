# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackETSE is a P2P distributed computing network that converts old phones into compute nodes. The system uses WebRTC for peer-to-peer connections with a WebSocket signaling server for peer discovery and node registry. A task coordinator provides load balancing and automatic node selection. User code executes in isolated Web Workers for basic sandboxing.

## Repository Structure

The project consists of three main TypeScript applications:

- **signaling-server/**: WebSocket signaling server (Node.js) that maintains node registry, facilitates peer discovery and WebRTC signal exchange
- **peer-node/**: Capacitor-based mobile/web application that functions as a P2P compute node
- **task-coordinator/**: Web application that submits tasks to the network with automatic load balancing

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

### Task Coordinator (task-coordinator/)

Install and build:
```bash
cd task-coordinator
npm install
npm run build    # Compile TypeScript once to www/dist/
npm run watch    # Compile in watch mode with auto-recompilation
```

Run in browser:
1. Ensure signaling server is running
2. Ensure at least one peer-node is connected
3. Build TypeScript (see above)
4. Open `www/index.html` in a browser
5. Write code, select load balancing strategy, and execute tasks

## Architecture

### Communication Flow

1. **Peer Registration**:
   - Nodes connect to the signaling server via WebSocket and register with type 'node' (format: `peer-xxxxxxxxx`)
   - Coordinators register with type 'coordinator' (format: `coordinator-xxxxxxxxx`)
   - Server maintains state for each node (idle/busy, tasks completed)

2. **Node Discovery**:
   - Coordinator requests list of available nodes from signaling server
   - Server filters and returns only nodes with type 'node' and their current status
   - Coordinator selects a node based on load balancing strategy (random, least-loaded, round-robin)

3. **WebRTC Signaling**:
   - Coordinator initiates P2P connection with selected node
   - Signaling server relays WebRTC signals between coordinator and node

4. **P2P Task Execution**:
   - Once P2P connection is established, coordinator sends task message with JavaScript code
   - Node updates status to 'busy' and reports to signaling server

5. **Worker Isolation**:
   - Node forwards code to Web Worker for isolated execution
   - Worker executes code using `new Function()` sandboxing

6. **Result Return**:
   - Worker sends result back to node's main thread
   - Node sends result to coordinator via P2P connection
   - Node updates status to 'idle' and increments task counter

### Message Protocol

The system uses JSON messages over WebSocket (signaling) and WebRTC data channels (P2P):

**Signaling Server Messages:**
- `register`: Client registers with a peer ID and type ('node' or 'coordinator')
- `signal`: WebRTC signal exchange (ICE candidates, SDP)
- `status_update`: Nodes report their status ('idle' or 'busy')
- `list_nodes`: Coordinators request list of available nodes
- `registered`: Server confirms registration
- `nodes_list`: Server sends list of nodes with their status and task counts
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

- [signaling-server/src/server.ts](signaling-server/src/server.ts): WebSocket server implementing peer registry with node status tracking, signal relay, and node discovery
- [peer-node/src/peer-node.ts](peer-node/src/peer-node.ts): Main P2P node logic - handles signaling, WebRTC connections, task coordination, and status reporting
- [peer-node/src/worker-sandbox.ts](peer-node/src/worker-sandbox.ts): Web Worker that executes user code in isolation
- [peer-node/www/index.html](peer-node/www/index.html): UI for the peer node application
- [task-coordinator/src/coordinator.ts](task-coordinator/src/coordinator.ts): Coordinator logic - node discovery, load balancing, P2P connection management, and task submission
- [task-coordinator/www/index.html](task-coordinator/www/index.html): UI for submitting tasks with different load balancing strategies

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

### Load Balancing Strategies

The task coordinator implements three load balancing strategies:

1. **Random**: Randomly selects an idle node from the available pool
2. **Least Loaded**: Selects the node with the fewest completed tasks
3. **Round Robin**: Simple rotation through available idle nodes

Strategies are implemented in [coordinator.ts:188-207](task-coordinator/src/coordinator.ts#L188-L207).

### Current Limitations

- Coordinators maintain a single P2P connection - if the connected node goes offline, must reconnect
- No task queue system - tasks are submitted one at a time
- No persistence of results
- Node capabilities (CPU, RAM) are not considered in load balancing
- No timeout enforcement at the worker level (only at coordinator level)

### Testing Strategy

Currently no automated tests exist. When testing manually:

1. Start signaling server: `cd signaling-server && npm run dev`
2. Start one or more peer nodes: `cd peer-node && npm run watch` then open `www/index.html`
3. Start coordinator: `cd task-coordinator && npm run watch` then open `www/index.html`
4. In the coordinator UI:
   - Verify nodes are listed in the status bar
   - Select a load balancing strategy
   - Enter JavaScript code (e.g., `function() { return 2 + 2; }`)
   - Click "Ejecutar Tarea"
   - Check result appears in the Result section
5. Monitor logs in all three components to see the full flow

Example tasks to test:
```javascript
// Simple calculation
function() { return 2 + 2; }

// Loop calculation
function() {
  let sum = 0;
  for (let i = 0; i < 1000; i++) {
    sum += i;
  }
  return sum;
}

// Array operations
function() {
  const data = [1, 2, 3, 4, 5];
  return data.reduce((acc, val) => acc + val, 0);
}
```
