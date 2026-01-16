// Configuración del servidor de señalización según el entorno

/**
 * Detecta si la aplicación está corriendo en un entorno móvil (Capacitor)
 * o en un navegador web normal
 */
export function isMobile(): boolean {
  // Capacitor usa el protocolo 'capacitor://' o 'http://localhost' en móvil
  return (
    window.location.protocol === 'capacitor:' ||
    (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && (window as any).Capacitor)
  );
}

/**
 * Obtiene la URL del servidor de señalización según el entorno
 * - En móvil: IP hardcodeada del ordenador Windows
 * - En navegador: usa localhost para desarrollo
 */
export function getSignalingServer(): string {
  if (isMobile()) {
    // En móvil, usar IP hardcodeada del ordenador Windows
    // return 'ws://172.18.37.128:3000';  // IP anterior
    return 'ws://192.168.1.129:3000';     // IP actual (Wi-Fi)
  } else {
    // En navegador de escritorio, usar localhost
    return 'ws://localhost:3000';
  }
}

/**
 * Guarda la configuración del servidor en localStorage (solo móvil)
 */
export function saveSignalingServer(serverUrl: string): void {
  localStorage.setItem('signaling_server', serverUrl);
  console.log('Servidor de señalización guardado:', serverUrl);
}

/**
 * Valida que una URL de servidor tenga el formato correcto
 */
export function validateServerUrl(url: string): boolean {
  try {
    // Debe empezar con ws:// o wss://
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      return false;
    }

    // Intentar crear un objeto URL para validar formato
    const wsUrl = new URL(url);

    // Debe tener un hostname
    if (!wsUrl.hostname) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}
