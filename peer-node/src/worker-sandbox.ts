// Web Worker para ejecutar código JavaScript de forma aislada

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

self.onmessage = function(e: MessageEvent<WorkerRequest>): void {
  const { taskId, code } = e.data;

  try {
    // Ejecutar código en un contexto limitado usando new Function()
    // NOTA: new Function() es más seguro que eval() pero NO es 100% seguro
    // Para producción considera usar sandboxes más robustos
    const userFunction = new Function('return ' + code)();

    // Ejecutar la función de usuario
    let result: any;
    if (typeof userFunction === 'function') {
      result = userFunction();
    } else {
      result = userFunction;
    }

    // Enviar resultado exitoso al hilo principal
    const response: WorkerResponse = {
      taskId: taskId,
      result: result,
      error: null
    };
    self.postMessage(response);

  } catch (error) {
    // Capturar y enviar errores al hilo principal
    const response: WorkerResponse = {
      taskId: taskId,
      result: null,
      error: {
        message: (error as Error).message,
        stack: (error as Error).stack
      }
    };
    self.postMessage(response);
  }
};
