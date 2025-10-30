import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Mapa de peers conectados: peerId -> WebSocket
const peers = new Map<string, WebSocket>();

// Tipos de mensajes
interface RegisterMessage {
  type: 'register';
  peerId: string;
}

interface SignalMessage {
  type: 'signal';
  target: string;
  signal: any;
}

type IncomingMessage = RegisterMessage | SignalMessage;

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
          // Registrar el peer con su ID único
          peerId = message.peerId;
          peers.set(peerId, ws);
          console.log(`Peer registrado: ${peerId}`);

          const registeredMsg: RegisteredMessage = {
            type: 'registered',
            peerId
          };
          ws.send(JSON.stringify(registeredMsg));
          break;

        case 'signal':
          // Reenviar señal de WebRTC al peer destino
          const targetPeer = peers.get(message.target);
          if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
            const signalMsg: OutgoingSignalMessage = {
              type: 'signal',
              from: peerId!,
              signal: message.signal
            };
            targetPeer.send(JSON.stringify(signalMsg));
          } else {
            const errorMsg: ErrorMessage = {
              type: 'error',
              message: 'Peer destino no encontrado'
            };
            ws.send(JSON.stringify(errorMsg));
          }
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
