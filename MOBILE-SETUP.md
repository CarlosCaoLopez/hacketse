# Configuración Móvil - HackETSE P2P

Este documento explica cómo ejecutar los nodos P2P en dispositivos móviles Android para el hackathon.

## Tu IP Local Detectada

```
172.18.41.236
```

Esta es la IP que debes usar en la configuración del servidor de señalización en los móviles.

## Pasos Rápidos para el Demo

### 1. Iniciar el Servidor de Señalización

```bash
cd signaling-server
npm install  # Solo la primera vez
npm run dev
```

El servidor estará escuchando en: `ws://172.18.41.236:3000`

### 2. Construir la APK para Android

```bash
cd peer-node

# Asegúrate de que está compilado
npm run build

# Sincroniza los assets con Android
npx cap sync

# Construye el APK (tarda 3-5 minutos la primera vez)
cd android
./gradlew assembleDebug

# La APK estará en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Instalar en Dispositivos Móviles

**Opción A: Con ADB (cable USB)**

```bash
# Habilita "Depuración USB" en el teléfono
# Conecta el teléfono por USB

# Verifica que el dispositivo se detecta
adb devices

# Instala la APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Si ya está instalada, usa:
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Opción B: Compartir APK**

1. Copia la APK a Google Drive / Dropbox / WhatsApp
2. Descarga en el móvil
3. Habilita "Instalar aplicaciones desconocidas"
4. Instala desde el gestor de archivos

### 4. Configurar el Móvil

1. Abre la app "P2P Node" en el móvil
2. Asegúrate de que el móvil está en la **misma red WiFi** que tu laptop
3. Verás un campo de configuración del servidor
4. Ingresa: `ws://172.18.41.236:3000`
5. Presiona "Conectar"
6. Deberías ver "Estado: Conectado" en verde

### 5. Iniciar el Coordinador (Load Balancer)

```bash
cd task-coordinator
npm run build  # Si no lo has hecho
```

Abre en el navegador: `file:///path/to/task-coordinator/www/index.html`

O simplemente abre `task-coordinator/www/index.html` con doble clic.

### 6. Ejecutar una Tarea de Prueba

En la interfaz del coordinador:

1. Verifica que se muestra "X nodos disponibles" (donde X >= 1)
2. En el campo de código, escribe:

```javascript
function() { return 2 + 2; }
```

3. Selecciona estrategia: "Random"
4. Click "Ejecutar Tarea"
5. Deberías ver el resultado: `4`

## Tareas de Prueba para el Demo

### Tarea Simple
```javascript
function() { return 2 + 2; }
```

### Tarea con Loop
```javascript
function() {
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }
  return sum;
}
```

### Tarea con Arrays
```javascript
function() {
  const data = Array.from({length: 1000}, (_, i) => i);
  return data.reduce((acc, val) => acc + val, 0);
}
```

### Tarea de Fibonacci
```javascript
function() {
  function fib(n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
  }
  return fib(20);
}
```

## Resolución de Problemas

### El móvil no se conecta al servidor

**Verifica:**
- ¿Móvil y laptop en la misma WiFi?
- ¿La IP es correcta? Usa: `ip addr show | grep "inet " | grep -v 127.0.0.1`
- ¿El servidor de señalización está corriendo?
- ¿El firewall bloquea el puerto 3000?

**Prueba la conexión:**
```bash
# En el móvil, abre el navegador y ve a:
http://172.18.41.236:3000
# Deberías ver "Cannot GET /" (eso es bueno, significa que el servidor responde)
```

### El coordinador no ve los nodos

**Verifica:**
- ¿El móvil dice "Estado: Conectado"?
- ¿El coordinador está conectado al mismo servidor?
- Abre la consola del navegador (F12) y busca errores
- En el log del servidor deberías ver registros de ambos peers

### La tarea no se ejecuta

**Verifica:**
- ¿El nodo está en estado "idle" (no "busy")?
- ¿La función de JavaScript es válida?
- Revisa el log del móvil para errores
- Intenta con una tarea más simple primero

### Recompilar después de cambios

Si cambias el código TypeScript:

```bash
cd peer-node
npm run build
npx cap sync
cd android
./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Cambiar la IP del Servidor

Si tu IP local cambia (ej: cambias de red WiFi):

1. Encuentra la nueva IP:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

2. Actualiza en [peer-node/src/config.ts](peer-node/src/config.ts#L27) la línea:
```typescript
return 'ws://NUEVA_IP_AQUI:3000';
```

3. Recompila y vuelve a instalar

## Demo en el Hackathon

### Setup (5 minutos antes)
1. ✅ Laptop conectada a WiFi/hotspot
2. ✅ Servidor de señalización corriendo
3. ✅ 2-3 móviles con la app instalada y conectados
4. ✅ Coordinador abierto en navegador
5. ✅ Verificar que todos los nodos aparecen como "idle"

### Script de Demo (3-5 minutos)
1. **Introducción** (30s): "Convertimos móviles viejos en red de cómputo distribuido P2P"
2. **Mostrar la red** (30s): Pantalla del coordinador con X nodos disponibles
3. **Tarea simple** (1min): Ejecutar `2+2`, mostrar resultado
4. **Load balancing** (1-2min): Ejecutar varias tareas, mostrar distribución
5. **Tarea computacional** (1min): Loop de 1M iteraciones
6. **Conclusión** (30s): Ventajas del P2P, reutilización de hardware

## Build para Producción (Opcional)

Para crear un APK firmado para distribución:

```bash
cd peer-node/android
./gradlew assembleRelease
# Requiere configurar keystore y firma
```

## Alternativa: Usar en Navegador Móvil

Si no puedes instalar la APK, puedes abrir en el navegador del móvil:

1. Asegúrate de tener un servidor HTTP en el peer-node:
```bash
cd peer-node/www
python3 -m http.server 8080
```

2. En el navegador del móvil ve a: `http://172.18.41.236:8080`

**Limitaciones**: No funciona en background, puede ser menos estable que la app nativa.

## Arquitectura Resumida

```
┌─────────────┐
│   Laptop    │
│             │
│ Signaling   │  ws://172.18.41.236:3000
│  Server     │
│  (Node.js)  │
└──────┬──────┘
       │
       │ WiFi Network
       │
   ┌───┴────────────┬──────────────┐
   │                │              │
┌──▼──────┐   ┌────▼────┐   ┌─────▼────┐
│ Móvil 1 │   │ Móvil 2 │   │  Laptop  │
│ (Node)  │   │ (Node)  │   │(Coordin.)│
└─────────┘   └─────────┘   └──────────┘
     ↑                             │
     └─────────────────────────────┘
           WebRTC P2P Connection
```

## Siguiente Paso

¿Listo para probar? Ejecuta:

```bash
./start-local.sh
```

O sigue los pasos manuales arriba.
