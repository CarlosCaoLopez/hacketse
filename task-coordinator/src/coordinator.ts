import SimplePeer from 'simple-peer';

// Configuración
const SIGNALING_SERVER = 'ws://localhost:3000';

// Tipos de mensajes del servidor de señalización
interface RegisterMessage {
  type: 'register';
  peerId: string;
  peerType: 'node' | 'coordinator';
}

interface SignalMessage {
  type: 'signal';
  target: string;
  signal: SimplePeer.SignalData;
}

interface ListNodesMessage {
  type: 'list_nodes';
}

interface RegisteredResponse {
  type: 'registered';
  peerId: string;
}

interface SignalResponse {
  type: 'signal';
  from: string;
  signal: SimplePeer.SignalData;
}

interface NodeInfo {
  peerId: string;
  status: 'idle' | 'busy';
  tasksCompleted: number;
}

interface NodesListResponse {
  type: 'nodes_list';
  nodes: NodeInfo[];
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

type ServerMessage = RegisteredResponse | SignalResponse | NodesListResponse | ErrorResponse;

// Tipos de mensajes P2P
interface TaskMessage {
  type: 'task';
  taskId: string;
  code: string;
}

interface ResultMessage {
  type: 'result';
  taskId: string;
  result: any;
  error: any;
}

// Estado del coordinador
let peerId: string = generatePeerId();
let ws: WebSocket | null = null;
let availableNodes: NodeInfo[] = [];
let activePeer: SimplePeer.Instance | null = null;
let pendingTasks: Map<string, (result: any, error: any) => void> = new Map();

// Referencias DOM
const statusEl = document.getElementById('status') as HTMLSpanElement;
const peerIdEl = document.getElementById('peerId') as HTMLSpanElement;
const nodesCountEl = document.getElementById('nodesCount') as HTMLSpanElement;
const logEl = document.getElementById('log') as HTMLDivElement;
const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
const resultEl = document.getElementById('result') as HTMLPreElement;
const strategySelect = document.getElementById('strategy') as HTMLSelectElement;

// Generar ID único para el coordinador
function generatePeerId(): string {
  return 'coordinator-' + Math.random().toString(36).substr(2, 9);
}

// Función de logging
function log(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  logEl.innerHTML += logLine + '<br>';
  logEl.scrollTop = logEl.scrollHeight;
}

// Actualizar UI
function updateStatus(connected: boolean): void {
  statusEl.textContent = connected ? 'Conectado' : 'Desconectado';
  statusEl.className = connected ? 'connected' : 'disconnected';
}

// Conectar al servidor de señalización
function connectToSignaling(): void {
  ws = new WebSocket(SIGNALING_SERVER);

  ws.onopen = () => {
    log('Conectado al servidor de señalización');
    // Registrar como coordinador
    const registerMsg: RegisterMessage = {
      type: 'register',
      peerId: peerId,
      peerType: 'coordinator'
    };
    ws!.send(JSON.stringify(registerMsg));
  };

  ws.onmessage = (event: MessageEvent) => {
    const message: ServerMessage = JSON.parse(event.data);

    switch (message.type) {
      case 'registered':
        log(`Registrado con ID: ${peerId}`);
        peerIdEl.textContent = peerId;
        updateStatus(true);
        // Solicitar lista de nodos inmediatamente
        requestNodesList();
        break;

      case 'nodes_list':
        availableNodes = message.nodes;
        nodesCountEl.textContent = availableNodes.length.toString();
        log(`Recibidos ${availableNodes.length} nodos disponibles`);
        displayNodes();
        break;

      case 'signal':
        log(`Señal recibida de ${message.from}`);
        if (activePeer) {
          activePeer.signal(message.signal);
        }
        break;

      case 'error':
        log(`Error: ${message.message}`);
        break;
    }
  };

  ws.onerror = (error: Event) => {
    log('Error en WebSocket');
  };

  ws.onclose = () => {
    log('Desconectado del servidor de señalización');
    updateStatus(false);
  };
}

// Solicitar lista de nodos al servidor
function requestNodesList(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg: ListNodesMessage = {
      type: 'list_nodes'
    };
    ws.send(JSON.stringify(msg));
  }
}

// Mostrar nodos disponibles en el log
function displayNodes(): void {
  if (availableNodes.length === 0) {
    log('⚠️ No hay nodos disponibles');
    return;
  }

  log('=== Nodos Disponibles ===');
  availableNodes.forEach(node => {
    log(`  - ${node.peerId} | Estado: ${node.status} | Tareas: ${node.tasksCompleted}`);
  });
  log('========================');
}

// Estrategias de selección de nodos
function selectNode(strategy: string): NodeInfo | null {
  // Filtrar solo nodos libres
  const idleNodes = availableNodes.filter(n => n.status === 'idle');

  if (idleNodes.length === 0) {
    log('⚠️ No hay nodos libres disponibles');
    return null;
  }

  switch (strategy) {
    case 'random':
      // Selección aleatoria
      return idleNodes[Math.floor(Math.random() * idleNodes.length)];

    case 'least-loaded':
      // Nodo con menos tareas completadas
      return idleNodes.reduce((min, node) =>
        node.tasksCompleted < min.tasksCompleted ? node : min
      );

    case 'round-robin':
      // Simplemente tomar el primero (en producción mantener un índice)
      return idleNodes[0];

    default:
      return idleNodes[0];
  }
}

// Establecer conexión P2P con un nodo
function connectToPeer(targetPeerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Estableciendo conexión P2P con ${targetPeerId}...`);

    activePeer = new SimplePeer({
      initiator: true,
      trickle: true
    });

    activePeer.on('signal', (signal: SimplePeer.SignalData) => {
      // Enviar señal al servidor para reenvío al nodo
      if (ws && ws.readyState === WebSocket.OPEN) {
        const signalMsg: SignalMessage = {
          type: 'signal',
          target: targetPeerId,
          signal: signal
        };
        ws.send(JSON.stringify(signalMsg));
      }
    });

    activePeer.on('connect', () => {
      log(`✓ Conexión P2P establecida con ${targetPeerId}`);
      resolve();
    });

    activePeer.on('data', (data: Uint8Array) => {
      handleIncomingData(data);
    });

    activePeer.on('error', (err: Error) => {
      log(`Error P2P: ${err.message}`);
      reject(err);
    });

    activePeer.on('close', () => {
      log('Conexión P2P cerrada');
      activePeer = null;
    });

    // Timeout de 10 segundos
    setTimeout(() => {
      if (!activePeer?.connected) {
        reject(new Error('Timeout estableciendo conexión P2P'));
      }
    }, 10000);
  });
}

// Manejar datos recibidos del nodo (resultados)
function handleIncomingData(data: Uint8Array): void {
  try {
    const message: ResultMessage = JSON.parse(new TextDecoder().decode(data));

    if (message.type === 'result') {
      log(`Resultado recibido para tarea: ${message.taskId}`);

      // Resolver la promesa pendiente
      const resolver = pendingTasks.get(message.taskId);
      if (resolver) {
        resolver(message.result, message.error);
        pendingTasks.delete(message.taskId);
      }
    }
  } catch (err) {
    log('Error procesando datos: ' + (err as Error).message);
  }
}

// Enviar tarea a un nodo
async function sendTask(code: string): Promise<any> {
  // Actualizar lista de nodos
  requestNodesList();

  // Esperar un momento para recibir la lista actualizada
  await new Promise(resolve => setTimeout(resolve, 500));

  // Seleccionar nodo según estrategia
  const strategy = strategySelect.value;
  const selectedNode = selectNode(strategy);

  if (!selectedNode) {
    throw new Error('No hay nodos disponibles para ejecutar la tarea');
  }

  log(`Nodo seleccionado: ${selectedNode.peerId} (estrategia: ${strategy})`);

  // Conectar al nodo si no estamos conectados
  if (!activePeer || !activePeer.connected) {
    await connectToPeer(selectedNode.peerId);
  }

  // Generar ID de tarea
  const taskId = 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

  // Crear promesa para esperar resultado
  const resultPromise = new Promise((resolve, reject) => {
    pendingTasks.set(taskId, (result, error) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });

    // Timeout de 30 segundos
    setTimeout(() => {
      if (pendingTasks.has(taskId)) {
        pendingTasks.delete(taskId);
        reject(new Error('Timeout esperando resultado de tarea'));
      }
    }, 30000);
  });

  // Enviar tarea
  const taskMsg: TaskMessage = {
    type: 'task',
    taskId: taskId,
    code: code
  };

  activePeer!.send(JSON.stringify(taskMsg));
  log(`Tarea ${taskId} enviada al nodo`);

  return resultPromise;
}

// Manejador del botón de enviar
submitBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();

  if (!code) {
    resultEl.textContent = 'Error: El código no puede estar vacío';
    resultEl.className = 'error';
    return;
  }

  submitBtn.disabled = true;
  resultEl.textContent = 'Ejecutando...';
  resultEl.className = '';

  try {
    const result = await sendTask(code);
    resultEl.textContent = 'Resultado:\n' + JSON.stringify(result, null, 2);
    resultEl.className = 'success';
    log('✓ Tarea completada exitosamente');
  } catch (err) {
    resultEl.textContent = 'Error:\n' + (err as Error).message;
    resultEl.className = 'error';
    log('✗ Error ejecutando tarea: ' + (err as Error).message);
  } finally {
    submitBtn.disabled = false;
  }
});

// Actualizar lista de nodos cada 5 segundos
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    requestNodesList();
  }
}, 5000);

// Inicializar aplicación
function init(): void {
  log('Iniciando coordinador de tareas...');
  connectToSignaling();
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
