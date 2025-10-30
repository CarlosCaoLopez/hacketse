# HackETSE - Red P2P de Cómputo Distribuido

Proyecto de hackathon que convierte teléfonos viejos en nodos de una red P2P para cómputo distribuido.

## Arquitectura

```
┌─────────────────────┐
│  Signaling Server   │ ← WebSocket Server (Node.js)
│   (Discovery)       │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐
│ Node1 │◄──►│ Node2 │  ← Simple-Peer (WebRTC)
└───────┘    └───────┘
   ▲
   │ Web Worker (Sandbox)
   │
┌──▼────────┐
│User Code  │
└───────────┘
```

## Componentes

### 1. Servidor de Señalización (`signaling-server/`)

Servidor WebSocket que facilita el descubrimiento de peers y el intercambio de señales WebRTC.

**Instalar y ejecutar:**
```bash
cd signaling-server
npm install
npm start
```

El servidor escuchará en `http://localhost:3000`

**Funcionalidad:**
- Registro de peers con ID único
- Reenvío de señales WebRTC entre peers
- Gestión de conexiones/desconexiones

### 2. Nodo P2P (`peer-node/`)

Aplicación Capacitor que funciona como nodo de la red P2P.

**Instalar dependencias:**
```bash
cd peer-node
npm install
```

**Ejecutar en navegador (desarrollo):**
```bash
# Simplemente abre el archivo www/index.html en tu navegador
# Asegúrate de que el servidor de señalización esté corriendo
```

**Compilar para móvil:**
```bash
# Inicializar Capacitor (solo primera vez)
npx cap init

# Añadir plataforma Android
npx cap add android

# Sincronizar código
npx cap sync

# Abrir en Android Studio
npx cap open android
```

**Funcionalidad:**
- Conexión al servidor de señalización
- Establecimiento de conexiones P2P con Simple-Peer
- Recepción de tareas (código JavaScript)
- Ejecución segura en Web Worker
- Envío de resultados de vuelta al solicitante

### 3. Web Worker Sandbox (`peer-node/www/worker-sandbox.js`)

Ejecuta código JavaScript de usuarios de forma aislada.

**Características:**
- Ejecución en hilo separado
- Uso de `new Function()` para sandboxing básico
- Captura de errores
- Comunicación asíncrona con el hilo principal

**⚠️ IMPORTANTE:** El sandboxing actual es básico. Para producción considera:
- Usar [isolated-vm](https://github.com/laverdet/isolated-vm)
- Implementar límites de tiempo de ejecución
- Restricciones de memoria
- Whitelist de APIs permitidas

## Flujo de Trabajo

1. **Inicio del nodo:**
   - Se conecta al servidor de señalización
   - Genera un Peer ID único
   - Inicializa el Web Worker

2. **Conexión P2P:**
   - Intercambia señales WebRTC vía servidor
   - Establece conexión directa peer-to-peer

3. **Ejecución de tareas:**
   - Recibe código JavaScript del peer remoto
   - Envía código al Web Worker
   - Worker ejecuta código de forma segura
   - Resultado se envía de vuelta al solicitante

## Ejemplo de Tarea

Para enviar una tarea a un nodo (desde otro peer):

```javascript
// Código a ejecutar en el nodo remoto
const taskCode = `
  function() {
    // Tu código aquí
    return 2 + 2;
  }
`;

// Enviar tarea via P2P
peer.send(JSON.stringify({
  type: 'task',
  taskId: 'task-123',
  code: taskCode
}));
```

## Stack Tecnológico

- **Frontend:** HTML/CSS/JavaScript
- **P2P:** Simple-Peer (WebRTC)
- **Señalización:** Node.js + Express + ws (WebSocket)
- **Móvil:** Capacitor
- **Sandboxing:** Web Worker + new Function()

## Próximos Pasos

- [ ] Implementar cliente que envía tareas
- [ ] Añadir autenticación de peers
- [ ] Mejorar sandboxing de seguridad
- [ ] Sistema de distribución de tareas (load balancing)
- [ ] Métricas y monitoreo de nodos
- [ ] Persistencia de resultados
- [ ] UI mejorada para gestión de tareas

## Seguridad

**⚠️ ADVERTENCIA:** Este es un prototipo para hackathon. NO usar en producción sin:
- Sandboxing robusto (isolated-vm, containers)
- Autenticación y autorización
- Encriptación end-to-end
- Rate limiting
- Validación de código
- Límites de recursos (CPU, memoria, tiempo)

## Licencia

MIT License - Proyecto educativo para hackathon
