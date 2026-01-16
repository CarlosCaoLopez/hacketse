// Declarar SimplePeer como variable global (cargada desde CDN)
declare const SimplePeer: any;

// Importar configuración
import { getSignalingServer, saveSignalingServer, validateServerUrl, isMobile } from './config.js';

// Tipos para SimplePeer
interface SimplePeerSignalData {
  type?: string;
  sdp?: string;
  candidate?: any;
}

interface SimplePeerInstance {
  signal(data: SimplePeerSignalData): void;
  send(data: string | ArrayBuffer | Uint8Array): void;
  destroy(): void;
  connected: boolean;
  on(event: string, callback: (...args: any[]) => void): void;
}

// Configuración dinámica del servidor
let SIGNALING_SERVER = getSignalingServer();

// Tipos de mensajes
interface RegisterMessage {
  type: 'register';
  peerId: string;
  peerType: 'node' | 'coordinator';
}

interface SignalMessage {
  type: 'signal';
  target: string;
  signal: SimplePeerSignalData;
}

interface RegisteredResponse {
  type: 'registered';
  peerId: string;
}

interface SignalResponse {
  type: 'signal';
  from: string;
  signal: SimplePeerSignalData;
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

interface StatusUpdateMessage {
  type: 'status_update';
  status: 'idle' | 'busy';
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
  error: {
    message: string;
    stack?: string;
  } | null;
}

// Estado del nodo
let peerId: string = generatePeerId();
let ws: WebSocket | null = null;
let peer: SimplePeerInstance | null = null;
let remotePeerId: string | null = null; // Guardar el ID del peer remoto
let worker: Worker | null = null;
let taskCount: number = 0;

// Referencias DOM
const statusEl = document.getElementById('status') as HTMLSpanElement;
const peerIdEl = document.getElementById('peerId') as HTMLSpanElement;
const taskCountEl = document.getElementById('taskCount') as HTMLSpanElement;
const logEl = document.getElementById('log') as HTMLDivElement;
const configPanelEl = document.getElementById('configPanel') as HTMLDivElement;
const serverInputEl = document.getElementById('serverInput') as HTMLInputElement;
const connectBtnEl = document.getElementById('connectBtn') as HTMLButtonElement;

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
  console.log('updateStatus llamado con:', connected);
  console.log('statusEl:', statusEl);
  if (statusEl) {
    statusEl.textContent = connected ? 'Conectado' : 'Desconectado';
    statusEl.className = connected ? 'connected' : 'disconnected';
    console.log('Estado actualizado en DOM');
  } else {
    console.error('statusEl no encontrado!');
  }
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

    // Reportar estado libre al servidor de señalización
    if (ws && ws.readyState === WebSocket.OPEN) {
      const statusMsg: StatusUpdateMessage = {
        type: 'status_update',
        status: 'idle'
      };
      ws.send(JSON.stringify(statusMsg));
      log('Estado actualizado: idle');
    }
  };

  log('Worker inicializado');
}

// Conectar al servidor de señalización
function connectToSignaling(): void {
  ws = new WebSocket(SIGNALING_SERVER);

  ws.onopen = () => {
    log('Conectado al servidor de señalización');
    // Registrar este peer como nodo de cómputo
    const registerMsg: RegisterMessage = {
      type: 'register',
      peerId: peerId,
      peerType: 'node'
    };
    ws!.send(JSON.stringify(registerMsg));
  };

  ws.onmessage = (event: MessageEvent) => {
    const message: ServerMessage = JSON.parse(event.data);

    switch (message.type) {
      case 'registered':
        log(`Registrado con ID: ${peerId}`);
        peerIdEl.textContent = peerId;
        updateStatus(true); // Actualizar estado a conectado
        break;

      case 'signal':
        log(`Señal recibida de ${message.from}`);
        // Guardar el ID del remitente primero (importante!)
        if (!remotePeerId) {
          remotePeerId = message.from;
        }
        // Si no hay peer activo, crear uno nuevo como receptor
        if (!peer) {
          initPeer(false); // Inicializar como receptor
        }
        // Procesar la señal
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
  const newPeer = new SimplePeer({
    initiator: initiator,
    trickle: true
  }) as SimplePeerInstance;

  newPeer.on('signal', (signal: SimplePeerSignalData) => {
    // Enviar señal al servidor para reenvío al peer remoto
    log(`Generando señal. remotePeerId: ${remotePeerId}, ws: ${ws ? 'conectado' : 'null'}`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (remotePeerId) {
        const signalMsg: SignalMessage = {
          type: 'signal',
          target: remotePeerId,
          signal: signal
        };
        ws.send(JSON.stringify(signalMsg));
        log(`✓ Señal enviada a ${remotePeerId}`);
      } else {
        log('✗ ERROR: remotePeerId es null, no se puede enviar señal');
      }
    }
  });

  newPeer.on('connect', () => {
    log('Conexión P2P establecida');
    updateStatus(true);
  });

  newPeer.on('data', (data: Uint8Array) => {
    handleIncomingData(data);
  });

  newPeer.on('error', (err: Error) => {
    log('Error P2P: ' + err.message);
  });

  newPeer.on('close', () => {
    log('Conexión P2P cerrada');
    peer = null;
    remotePeerId = null;
  });

  peer = newPeer;
}

// Manejar datos recibidos de otros peers
function handleIncomingData(data: Uint8Array): void {
  try {
    const message: TaskMessage = JSON.parse(new TextDecoder().decode(data));

    if (message.type === 'task') {
      log(`Nueva tarea recibida: ${message.taskId}`);

      // Reportar estado ocupado al servidor de señalización
      if (ws && ws.readyState === WebSocket.OPEN) {
        const statusMsg: StatusUpdateMessage = {
          type: 'status_update',
          status: 'busy'
        };
        ws.send(JSON.stringify(statusMsg));
        log('Estado actualizado: busy');
      }

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

// Configurar panel de servidor (solo en móvil)
function setupConfigPanel(): void {
  if (isMobile()) {
    // Mostrar panel de configuración en móvil
    configPanelEl.style.display = 'block';

    // Cargar servidor guardado si existe
    const savedServer = localStorage.getItem('signaling_server');
    if (savedServer) {
      serverInputEl.value = savedServer;
    } else {
      serverInputEl.value = getSignalingServer();
    }

    // Manejar clic en botón conectar
    connectBtnEl.addEventListener('click', () => {
      const serverUrl = serverInputEl.value.trim();

      if (!validateServerUrl(serverUrl)) {
        log('❌ URL inválida. Debe empezar con ws:// o wss://');
        alert('URL inválida. Formato correcto: ws://IP:PUERTO\nEjemplo: ws://192.168.1.100:3000');
        return;
      }

      // Guardar configuración
      saveSignalingServer(serverUrl);
      SIGNALING_SERVER = serverUrl;

      log(`✓ Servidor configurado: ${serverUrl}`);

      // Deshabilitar botón y conectar
      connectBtnEl.disabled = true;
      serverInputEl.disabled = true;

      // Iniciar conexión
      initWorker();
      connectToSignaling();
    });

    log('📱 Modo móvil detectado. Configura el servidor de señalización.');
  } else {
    // En navegador, conectar automáticamente
    log('🖥️  Modo navegador detectado. Conectando a localhost...');
    initWorker();
    connectToSignaling();
  }
}

// Inicializar aplicación
function init(): void {
  log('Iniciando nodo P2P...');
  setupConfigPanel();
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
