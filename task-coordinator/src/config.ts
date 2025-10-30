// Configuración del servidor de señalización para el coordinador

/**
 * Obtiene la URL del servidor de señalización
 * Para el coordinador normalmente corre en navegador de escritorio
 */
export function getSignalingServer(): string {
  // Intentar leer de localStorage si fue configurado manualmente
  const savedServer = localStorage.getItem('signaling_server');
  if (savedServer) {
    return savedServer;
  }

  // Por defecto usar localhost para desarrollo
  return 'ws://localhost:3000';
}

/**
 * Guarda la configuración del servidor en localStorage
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
