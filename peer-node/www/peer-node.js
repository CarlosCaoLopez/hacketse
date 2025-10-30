// Configuración
const SIGNALING_SERVER = 'ws://localhost:3000';

// Estado del nodo
let peerId = generatePeerId();
let ws = null;
let peer = null;
let worker = null;
let taskCount = 0;

// Referencias DOM
const statusEl = document.getElementById('status');
const peerIdEl = document.getElementById('peerId');
const taskCountEl = document.getElementById('taskCount');
const logEl = document.getElementById('log');

// Generar ID único para el peer
function generatePeerId() {
  return 'peer-' + Math.random().toString(36).substr(2, 9);
}

// Función de logging
function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  logEl.innerHTML += logLine + '<br>';
  logEl.scrollTop = logEl.scrollHeight;
}

// Actualizar UI
function updateStatus(connected) {
  statusEl.textContent = connected ? 'Conectado' : 'Desconectado';
  statusEl.className = connected ? 'connected' : 'disconnected';
}

// Inicializar Web Worker
function initWorker() {
  worker = new Worker('worker-sandbox.js');

  worker.onmessage = function(e) {
    const { taskId, result, error } = e.data;
    log(`Tarea ${taskId} completada`);

    // Enviar resultado de vuelta al solicitante
    if (peer && peer.connected) {
      peer.send(JSON.stringify({
        type: 'result',
        taskId: taskId,
        result: result,
        error: error
      }));
    }

    taskCount++;
    taskCountEl.textContent = taskCount;
  };

  log('Worker inicializado');
}

// Conectar al servidor de señalización
function connectToSignaling() {
  ws = new WebSocket(SIGNALING_SERVER);

  ws.onopen = () => {
    log('Conectado al servidor de señalización');
    // Registrar este peer
    ws.send(JSON.stringify({
      type: 'register',
      peerId: peerId
    }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

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

  ws.onerror = (error) => {
    log('Error en WebSocket: ' + error);
  };

  ws.onclose = () => {
    log('Desconectado del servidor de señalización');
    updateStatus(false);
  };
}

// Inicializar conexión P2P con Simple-Peer
function initPeer(initiator) {
  peer = new SimplePeer({
    initiator: initiator,
    trickle: true
  });

  peer.on('signal', (signal) => {
    // Enviar señal al servidor para reenvío
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'signal',
        target: 'otro-peer-id', // En producción, esto vendría de la UI
        signal: signal
      }));
    }
  });

  peer.on('connect', () => {
    log('Conexión P2P establecida');
    updateStatus(true);
  });

  peer.on('data', (data) => {
    handleIncomingData(data);
  });

  peer.on('error', (err) => {
    log('Error P2P: ' + err.message);
  });

  peer.on('close', () => {
    log('Conexión P2P cerrada');
    updateStatus(false);
  });
}

// Manejar datos recibidos de otros peers
function handleIncomingData(data) {
  try {
    const message = JSON.parse(data.toString());

    if (message.type === 'task') {
      log(`Nueva tarea recibida: ${message.taskId}`);

      // Enviar tarea al worker para ejecución segura
      worker.postMessage({
        taskId: message.taskId,
        code: message.code
      });
    }
  } catch (err) {
    log('Error procesando datos: ' + err.message);
  }
}

// Inicializar aplicación
function init() {
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
