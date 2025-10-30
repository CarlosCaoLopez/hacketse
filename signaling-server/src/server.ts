import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Información de cada peer
interface PeerInfo {
  ws: WebSocket;
  type: 'node' | 'coordinator'; // Tipo de peer
  status: 'idle' | 'busy';
  tasksCompleted: number;
  connectedAt: Date;
}

// Mapa de peers conectados: peerId -> PeerInfo
const peers = new Map<string, PeerInfo>();

// Tipos de mensajes
interface RegisterMessage {
  type: 'register';
  peerId: string;
  peerType: 'node' | 'coordinator'; // Distinguir nodos de coordinadores
}

interface SignalMessage {
  type: 'signal';
  target: string;
  signal: any;
}

interface StatusUpdateMessage {
  type: 'status_update';
  status: 'idle' | 'busy';
}

interface ListNodesMessage {
  type: 'list_nodes';
}

type IncomingMessage = RegisterMessage | SignalMessage | StatusUpdateMessage | ListNodesMessage;

interface OutgoingSignalMessage {
  type: 'signal';
  from: string;
  signal: any;
}

interface RegisteredMessage {
  type: 'registered';
  peerId: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

interface NodeInfo {
  peerId: string;
  status: 'idle' | 'busy';
  tasksCompleted: number;
}

interface NodesListMessage {
  type: 'nodes_list';
  nodes: NodeInfo[];
}

app.get('/', (req, res) => {
  res.send('Servidor de Señalización P2P activo');
});

wss.on('connection', (ws: WebSocket) => {
  console.log('Nueva conexión WebSocket');
  let peerId: string | null = null;

  ws.on('message', (data: Buffer) => {
    try {
      const message: IncomingMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'register':
          // Registrar el peer con su ID único y tipo
          peerId = message.peerId;
          peers.set(peerId, {
            ws: ws,
            type: message.peerType,
            status: 'idle',
            tasksCompleted: 0,
            connectedAt: new Date()
          });
          console.log(`Peer registrado: ${peerId} (tipo: ${message.peerType})`);

          const registeredMsg: RegisteredMessage = {
            type: 'registered',
            peerId
          };
          ws.send(JSON.stringify(registeredMsg));
          break;

        case 'signal':
          // Reenviar señal de WebRTC al peer destino
          const targetPeerInfo = peers.get(message.target);
          if (targetPeerInfo && targetPeerInfo.ws.readyState === WebSocket.OPEN) {
            const signalMsg: OutgoingSignalMessage = {
              type: 'signal',
              from: peerId!,
              signal: message.signal
            };
            targetPeerInfo.ws.send(JSON.stringify(signalMsg));
          } else {
            const errorMsg: ErrorMessage = {
              type: 'error',
              message: 'Peer destino no encontrado'
            };
            ws.send(JSON.stringify(errorMsg));
          }
          break;

        case 'status_update':
          // Actualizar estado del nodo
          if (peerId) {
            const peerInfo = peers.get(peerId);
            if (peerInfo) {
              peerInfo.status = message.status;
              if (message.status === 'idle') {
                peerInfo.tasksCompleted++;
              }
              console.log(`Peer ${peerId} cambió estado a: ${message.status}`);
            }
          }
          break;

        case 'list_nodes':
          // Enviar lista de nodos disponibles (solo nodos tipo 'node', no coordinadores)
          const availableNodes: NodeInfo[] = Array.from(peers.entries())
            .filter(([_, info]) => info.type === 'node')
            .map(([id, info]) => ({
              peerId: id,
              status: info.status,
              tasksCompleted: info.tasksCompleted
            }));

          const nodesListMsg: NodesListMessage = {
            type: 'nodes_list',
            nodes: availableNodes
          };
          ws.send(JSON.stringify(nodesListMsg));
          console.log(`Enviando lista de ${availableNodes.length} nodos a ${peerId}`);
          break;

        default:
          console.log('Tipo de mensaje desconocido:', (message as any).type);
      }
    } catch (err) {
      console.error('Error procesando mensaje:', err);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log(`Peer desconectado: ${peerId}`);
    }
  });

  ws.on('error', (err: Error) => {
    console.error('Error en WebSocket:', err);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de señalización escuchando en puerto ${PORT}`);
});
