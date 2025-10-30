# HackETSE - Red P2P de Cómputo Distribuido

Proyecto de hackathon que convierte teléfonos viejos en nodos de una red P2P para cómputo distribuido.

## Arquitectura

```
┌──────────────┐
│   Usuario    │
└──────┬───────┘
       │
┌──────▼────────────────┐
│  Task Coordinator     │ ← Cliente web que envía tareas
│  (Load Balancing)     │
└──────┬────────────────┘
       │ WebSocket
┌──────▼────────────────┐
│  Signaling Server     │ ← Registro de nodos + señalización WebRTC
│  (Node Registry)      │
└──────┬────────────────┘
       │ WebSocket
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Node1│ │Node2│ ← Nodos P2P (teléfonos viejos)
└──┬──┘ └──┬──┘
   │       │
   │ WebRTC│ (conexión directa)
   └───┬───┘
       │
   ┌───▼────────┐
   │Web Worker  │ ← Ejecución segura de código
   └────────────┘
```

## Componentes

### 1. Servidor de Señalización (`signaling-server/`)

Servidor WebSocket TypeScript que facilita el descubrimiento de peers y el intercambio de señales WebRTC.

**Instalar y ejecutar:**
```bash
cd signaling-server
npm install
npm run build    # Compilar TypeScript
npm start        # Ejecutar servidor
```

**Desarrollo con auto-reload:**
```bash
npm run dev      # Ejecutar con ts-node
```

El servidor escuchará en `http://localhost:3000`

**Funcionalidad:**
- Registro de peers con ID único (nodos y coordinadores)
- Mantiene estado de cada nodo (idle/busy, tareas completadas)
- Proporciona lista de nodos disponibles a coordinadores
- Reenvío de señales WebRTC entre peers
- Gestión de conexiones/desconexiones

### 2. Nodo P2P (`peer-node/`)

Aplicación Capacitor TypeScript que funciona como nodo de la red P2P.

**Instalar dependencias:**
```bash
cd peer-node
npm install
```

**Compilar TypeScript:**
```bash
npm run build     # Compilar una vez
npm run watch     # Compilar en modo watch (auto-recompilación)
```

**Ejecutar en navegador (desarrollo):**
```bash
# 1. Compilar TypeScript (ver arriba)
# 2. Abrir www/index.html en tu navegador
# 3. Asegúrate de que el servidor de señalización esté corriendo
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
- Conexión al servidor de señalización (se registra como 'node')
- Reporte de estado (idle/busy) al servidor
- Establecimiento de conexiones P2P con Simple-Peer
- Recepción de tareas (código JavaScript)
- Ejecución segura en Web Worker
- Envío de resultados de vuelta al solicitante

### 3. Coordinador de Tareas (`task-coordinator/`)

Aplicación web que permite enviar tareas a la red distribuida con selección automática de nodos.

**Instalar dependencias:**
```bash
cd task-coordinator
npm install
```

**Compilar TypeScript:**
```bash
npm run build     # Compilar una vez
npm run watch     # Compilar en modo watch (auto-recompilación)
```

**Ejecutar:**
```bash
# 1. Compilar TypeScript (ver arriba)
# 2. Abrir www/index.html en tu navegador
# 3. Asegúrate de que el servidor de señalización esté corriendo
# 4. Asegúrate de tener al menos un nodo conectado
```

**Funcionalidad:**
- Interfaz web para enviar código JavaScript
- Se registra como 'coordinator' en el servidor
- Consulta lista de nodos disponibles
- Selección automática de nodo según estrategia:
  - **Random**: Selección aleatoria entre nodos libres
  - **Least Loaded**: Nodo con menos tareas completadas
  - **Round Robin**: Rotación entre nodos
- Establece conexión P2P con el nodo seleccionado
- Envía tarea y espera resultado
- Muestra resultado en tiempo real

### 4. Web Worker Sandbox (`peer-node/src/worker-sandbox.ts`)

Ejecuta código JavaScript de usuarios de forma aislada (compilado a `www/dist/worker-sandbox.js`).

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

## Flujo de Trabajo Completo

1. **Inicio del sistema:**
   - Servidor de señalización se ejecuta en `localhost:3000`
   - Nodos P2P se conectan y registran como tipo 'node'
   - Coordinador se conecta y registra como tipo 'coordinator'

2. **Envío de tarea:**
   - Usuario escribe código en el coordinador
   - Coordinador solicita lista de nodos al servidor
   - Coordinador selecciona nodo según estrategia (random, least-loaded, etc.)
   - Coordinador establece conexión P2P con el nodo seleccionado

3. **Ejecución:**
   - Nodo recibe tarea y cambia estado a 'busy'
   - Nodo envía código al Web Worker
   - Worker ejecuta código de forma aislada
   - Worker devuelve resultado o error

4. **Resultado:**
   - Nodo envía resultado al coordinador vía P2P
   - Nodo cambia estado a 'idle' e incrementa contador de tareas
   - Coordinador muestra resultado al usuario
   - Nodo queda disponible para nuevas tareas

## Ejemplo de Uso Completo

**Paso 1: Iniciar servidor de señalización**
```bash
cd signaling-server
npm install
npm run dev
```

**Paso 2: Iniciar uno o más nodos**
```bash
cd peer-node
npm install
npm run watch

# En otro terminal o navegador
# Abrir www/index.html en el navegador
```

**Paso 3: Iniciar coordinador**
```bash
cd task-coordinator
npm install
npm run watch

# En otro terminal o navegador
# Abrir www/index.html en el navegador
```

**Paso 4: Enviar tarea desde el coordinador**
- Escribir código en el área de texto (ej: `function() { return 2 + 2; }`)
- Seleccionar estrategia de load balancing
- Hacer clic en "Ejecutar Tarea"
- Ver resultado en tiempo real

## Ejemplos de Tareas

**Tarea simple:**
```javascript
function() {
  return 2 + 2;
}
```

**Tarea con cálculos:**
```javascript
function() {
  let sum = 0;
  for (let i = 0; i < 1000; i++) {
    sum += i;
  }
  return sum;
}
```

**Tarea con datos:**
```javascript
function() {
  const data = [1, 2, 3, 4, 5];
  return data.reduce((acc, val) => acc + val, 0);
}
```

## Stack Tecnológico

- **Lenguaje:** TypeScript
- **Frontend:** HTML/CSS
- **P2P:** Simple-Peer (WebRTC)
- **Señalización:** Node.js + Express + ws (WebSocket)
- **Móvil:** Capacitor
- **Sandboxing:** Web Worker + new Function()

## Características Implementadas

- ✅ Servidor de señalización con registro de nodos
- ✅ Sistema de distribución de tareas (load balancing)
- ✅ Cliente coordinador que envía tareas
- ✅ Selección automática de nodos (Random, Least Loaded, Round Robin)
- ✅ Reporte de estado de nodos (idle/busy)
- ✅ Ejecución segura en Web Worker
- ✅ Interfaz web para coordinador y nodos

## Próximos Pasos

- [ ] Añadir autenticación de peers
- [ ] Mejorar sandboxing de seguridad (isolated-vm)
- [ ] Métricas y monitoreo avanzado de nodos
- [ ] Persistencia de resultados
- [ ] Sistema de colas para múltiples tareas
- [ ] Soporte para tareas de larga duración
- [ ] Reconexión automática en caso de fallo

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
