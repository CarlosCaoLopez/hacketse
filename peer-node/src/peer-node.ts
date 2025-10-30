import SimplePeer from 'simple-peer';

// Configuración
const SIGNALING_SERVER = 'ws://localhost:3000';

// Tipos de mensajes
interface RegisterMessage {
  type: 'register';
  peerId: string;
}

interface SignalMessage {
  type: 'signal';
  target: string;
  signal: SimplePeer.SignalData;
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

interface ErrorResponse {
  type: 'error';
  message: string;
}

type ServerMessage = RegisteredResponse | SignalResponse | ErrorResponse;

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

interface WorkerRequest {
  taskId: string;
  code: string;
}

interface WorkerResponse {
  taskId: string;
  result: any;
  error: any;
}

// Estado del nodo
let peerId: string = generatePeerId();
let ws: WebSocket | null = null;
let peer: SimplePeer.Instance | null = null;
let worker: Worker | null = null;
let taskCount: number = 0;

// Referencias DOM
const statusEl = document.getElementById('status') as HTMLSpanElement;
const peerIdEl = document.getElementById('peerId') as HTMLSpanElement;
const taskCountEl = document.getElementById('taskCount') as HTMLSpanElement;
const logEl = document.getElementById('log') as HTMLDivElement;

// Generar ID único para el peer
function generatePeerId(): string {
  return 'peer-' + Math.random().toString(36).substr(2, 9);
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

// Inicializar Web Worker
function initWorker(): void {
  worker = new Worker('dist/worker-sandbox.js');

  worker.onmessage = function(e: MessageEvent<WorkerResponse>) {
    const { taskId, result, error } = e.data;
    log(`Tarea ${taskId} completada`);

    // Enviar resultado de vuelta al solicitante
    if (peer && peer.connected) {
      const resultMsg: ResultMessage = {
        type: 'result',
        taskId: taskId,
        result: result,
        error: error
      };
      peer.send(JSON.stringify(resultMsg));
    }

    taskCount++;
    taskCountEl.textContent = taskCount.toString();
  };

  log('Worker inicializado');
}

// Conectar al servidor de señalización
function connectToSignaling(): void {
  ws = new WebSocket(SIGNALING_SERVER);

  ws.onopen = () => {
    log('Conectado al servidor de señalización');
    // Registrar este peer
    const registerMsg: RegisterMessage = {
      type: 'register',
      peerId: peerId
    };
    ws!.send(JSON.stringify(registerMsg));
  };

  ws.onmessage = (event: MessageEvent) => {
    const message: ServerMessage = JSON.parse(event.data);

    switch (message.type) {
      case 'registered':
        log(`Registrado con ID: ${peerId}`);
        peerIdEl.textContent = peerId;
        initPeer(false); // Inicializar como receptor
        break;

      case 'signal':
        log(`Señal recibida de ${message.from}`);
        if (peer) {
          peer.signal(message.signal);
        }
        break;

      case 'error':
        log(`Error: ${message.message}`);
        break;
    }
  };

  ws.onerror = (error: Event) => {
    log('Error en WebSocket: ' + error);
  };

  ws.onclose = () => {
    log('Desconectado del servidor de señalización');
    updateStatus(false);
  };
}

// Inicializar conexión P2P con Simple-Peer
function initPeer(initiator: boolean): void {
  peer = new SimplePeer({
    initiator: initiator,
    trickle: true
  });

  peer.on('signal', (signal: SimplePeer.SignalData) => {
    // Enviar señal al servidor para reenvío
    if (ws && ws.readyState === WebSocket.OPEN) {
      const signalMsg: SignalMessage = {
        type: 'signal',
        target: 'otro-peer-id', // En producción, esto vendría de la UI
        signal: signal
      };
      ws.send(JSON.stringify(signalMsg));
    }
  });

  peer.on('connect', () => {
    log('Conexión P2P establecida');
    updateStatus(true);
  });

  peer.on('data', (data: Uint8Array) => {
    handleIncomingData(data);
  });

  peer.on('error', (err: Error) => {
    log('Error P2P: ' + err.message);
  });

  peer.on('close', () => {
    log('Conexión P2P cerrada');
    updateStatus(false);
  });
}

// Manejar datos recibidos de otros peers
function handleIncomingData(data: Uint8Array): void {
  try {
    const message: TaskMessage = JSON.parse(new TextDecoder().decode(data));

    if (message.type === 'task') {
      log(`Nueva tarea recibida: ${message.taskId}`);

      // Enviar tarea al worker para ejecución segura
      const workerMsg: WorkerRequest = {
        taskId: message.taskId,
        code: message.code
      };
      worker!.postMessage(workerMsg);
    }
  } catch (err) {
    log('Error procesando datos: ' + (err as Error).message);
  }
}

// Inicializar aplicación
function init(): void {
  log('Iniciando nodo P2P...');
  initWorker();
  connectToSignaling();
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
