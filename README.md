# PWS (Peer Web Services): P2P Distributed Computing Network

---

**PWS (Peer Web Services)** is an innovative distributed computing platform that transforms old smartphones and unused devices into powerful compute nodes within a peer-to-peer network. Built for the HackETSE hackathon, this project demonstrates how to leverage WebRTC technology to create a decentralized task execution system without requiring traditional server infrastructure for compute operations.

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Web Workers](https://img.shields.io/badge/Web_Workers-FF6F00?style=for-the-badge&logo=javascript&logoColor=white)

## What is PWS?

PWS enables **distributed code execution** by connecting idle devices (especially old phones) as compute nodes that can execute JavaScript tasks submitted by coordinators. The system features:

- **Direct P2P Communication**: Uses WebRTC data channels for direct peer-to-peer connections, eliminating the need for central compute servers
- **Smart Load Balancing**: Automatically distributes tasks across available nodes using strategies like Random, Least Loaded, and Round Robin
- **Real-time Node Discovery**: WebSocket signaling server maintains a live registry of available nodes with their current status (idle/busy)
- **Isolated Code Execution**: Tasks run in Web Workers for basic sandboxing and security
- **Mobile-First Design**: Built with Capacitor to deploy compute nodes on Android/iOS devices
- **Zero Infrastructure**: Only requires a lightweight signaling server for peer discovery and WebRTC setup

## Why PWS?

Traditional distributed computing requires dedicated servers and complex infrastructure. PWS democratizes distributed computing by:

1. **Repurposing Old Devices**: Give new life to old smartphones as compute nodes
2. **Reducing E-Waste**: Extend device lifecycle by converting them into useful computing resources
3. **Cost-Effective**: No need for expensive server infrastructure - use what you already have
4. **Educational**: Learn WebRTC, P2P networking, load balancing, and distributed systems
5. **Scalable**: Add more nodes simply by connecting more devices
6. **Decentralized**: No single point of failure for task execution (signaling server only handles discovery)

## How It Works

The system consists of three TypeScript-based components that work together to create a complete distributed computing network:

1. **Signaling Server**: Lightweight WebSocket server that manages node registry, facilitates peer discovery, and relays WebRTC signaling messages
2. **Peer Nodes**: Mobile/web applications (via Capacitor) that register as compute nodes, receive tasks, execute code in isolated Web Workers, and return results
3. **Task Coordinator**: Web interface where users submit JavaScript code, select load balancing strategies, and receive execution results in real-time

## Architecture

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
┌──────▼────────────────┐
│  Task Coordinator     │ ← Web client that sends tasks
│  (Load Balancing)     │
└──────┬────────────────┘
       │ WebSocket
┌──────▼────────────────┐
│  Signaling Server     │ ← Node registry + WebRTC signaling
│  (Node Registry)      │
└──────┬────────────────┘
       │ WebSocket
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Node1│ │Node2│ ← P2P Nodes (old phones)
└──┬──┘ └──┬──┘
   │       │
   │ WebRTC│ (direct connection)
   └───┬───┘
       │
   ┌───▼────────┐
   │Web Worker  │ ← Secure code execution
   └────────────┘
```

## Components

### 1. Signaling Server (`signaling-server/`)

TypeScript WebSocket server that facilitates peer discovery and WebRTC signal exchange.

**Install and run:**
```bash
cd signaling-server
npm install
npm run build    # Compile TypeScript
npm start        # Run server
```

**Development with auto-reload:**
```bash
npm run dev      # Run with ts-node
```

The server will listen on `http://localhost:3000`

**Functionality:**
- Peer registration with unique ID (nodes and coordinators)
- Maintains state of each node (idle/busy, completed tasks)
- Provides list of available nodes to coordinators
- WebRTC signal relay between peers
- Connection/disconnection management

### 2. P2P Node (`peer-node/`)

Capacitor TypeScript application that functions as a P2P network node.

**Install dependencies:**
```bash
cd peer-node
npm install
```

**Compile TypeScript:**
```bash
npm run build     # Compile once
npm run watch     # Compile in watch mode (auto-recompilation)
```

**Run in browser (development):**
```bash
# 1. Compile TypeScript (see above)
# 2. Open www/index.html in your browser
# 3. Make sure the signaling server is running
```

**Compile for mobile:**
```bash
# Initialize Capacitor (first time only)
npx cap init

# Add Android platform
npx cap add android

# Sync code
npx cap sync

# Open in Android Studio
npx cap open android
```

**Functionality:**
- Connection to signaling server (registers as 'node')
- Status reporting (idle/busy) to server
- P2P connection establishment with Simple-Peer
- Task reception (JavaScript code)
- Secure execution in Web Worker
- Sending results back to requester

### 3. Task Coordinator (`task-coordinator/`)

Web application that allows sending tasks to the distributed network with automatic node selection.

**Install dependencies:**
```bash
cd task-coordinator
npm install
```

**Compile TypeScript:**
```bash
npm run build     # Compile once
npm run watch     # Compile in watch mode (auto-recompilation)
```

**Run:**
```bash
# 1. Compile TypeScript (see above)
# 2. Open www/index.html in your browser
# 3. Make sure the signaling server is running
# 4. Make sure you have at least one node connected
```

**Functionality:**
- Web interface to send JavaScript code
- Registers as 'coordinator' on the server
- Queries list of available nodes
- Automatic node selection based on strategy:
  - **Random**: Random selection among idle nodes
  - **Least Loaded**: Node with fewest completed tasks
  - **Round Robin**: Rotation among nodes
- Establishes P2P connection with selected node
- Sends task and waits for result
- Shows result in real-time

### 4. Web Worker Sandbox (`peer-node/src/worker-sandbox.ts`)

Executes user JavaScript code in isolation (compiled to `www/dist/worker-sandbox.js`).

**Features:**
- Execution in separate thread
- Use of `new Function()` for basic sandboxing
- Error capture
- Asynchronous communication with main thread

**⚠️ IMPORTANT:** Current sandboxing is basic. For production consider:
- Using [isolated-vm](https://github.com/laverdet/isolated-vm)
- Implementing execution time limits
- Memory restrictions
- Whitelist of allowed APIs

## Complete Workflow

1. **System startup:**
   - Signaling server runs on `localhost:3000`
   - P2P nodes connect and register as type 'node'
   - Coordinator connects and registers as type 'coordinator'

2. **Task submission:**
   - User writes code in the coordinator
   - Coordinator requests list of nodes from server
   - Coordinator selects node based on strategy (random, least-loaded, etc.)
   - Coordinator establishes P2P connection with selected node

3. **Execution:**
   - Node receives task and changes status to 'busy'
   - Node sends code to Web Worker
   - Worker executes code in isolation
   - Worker returns result or error

4. **Result:**
   - Node sends result to coordinator via P2P
   - Node changes status to 'idle' and increments task counter
   - Coordinator shows result to user
   - Node becomes available for new tasks

## Complete Usage Example

**Step 1: Start signaling server**
```bash
cd signaling-server
npm install
npm run dev
```

**Step 2: Start one or more nodes**
```bash
cd peer-node
npm install
npm run watch

# In another terminal or browser
# Open www/index.html in the browser
```

**Step 3: Start coordinator**
```bash
cd task-coordinator
npm install
npm run watch

# In another terminal or browser
# Open www/index.html in the browser
```

**Step 4: Send task from coordinator**
- Write code in the text area (e.g.: `function() { return 2 + 2; }`)
- Select load balancing strategy
- Click "Ejecutar Tarea" (Execute Task)
- See result in real-time

## Task Examples

**Note:** The system is currently only prepared to execute JavaScript code. All tasks must be written as JavaScript functions.

**Simple task:**
```javascript
function() {
  return 2 + 2;
}
```

**Task with calculations:**
```javascript
function() {
  let sum = 0;
  for (let i = 0; i < 1000; i++) {
    sum += i;
  }
  return sum;
}
```

**Task with data:**
```javascript
function() {
  const data = [1, 2, 3, 4, 5];
  return data.reduce((acc, val) => acc + val, 0);
}
```

## Implemented Features

- ✅ Signaling server with node registry
- ✅ Task distribution system (load balancing)
- ✅ Coordinator client that sends tasks
- ✅ Automatic node selection (Random, Least Loaded, Round Robin)
- ✅ Node status reporting (idle/busy)
- ✅ Secure execution in Web Worker
- ✅ Web interface for coordinator and nodes

## Next Steps

- [ ] Add peer authentication
- [ ] Improve security sandboxing (isolated-vm)
- [ ] Advanced node metrics and monitoring
- [ ] Result persistence
- [ ] Queue system for multiple tasks
- [ ] Support for long-running tasks
- [ ] Automatic reconnection on failure

## Security

**⚠️ WARNING:** This is a hackathon prototype. DO NOT use in production without:
- Robust sandboxing (isolated-vm, containers)
- Authentication and authorization
- End-to-end encryption
- Rate limiting
- Code validation
- Resource limits (CPU, memory, time)

## License

MIT License - Educational hackathon project
