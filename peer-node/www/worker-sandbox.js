// Web Worker para ejecutar código JavaScript de forma aislada

self.onmessage = function(e) {
  const { taskId, code } = e.data;

  try {
    // Ejecutar código en un contexto limitado usando new Function()
    // NOTA: new Function() es más seguro que eval() pero NO es 100% seguro
    // Para producción considera usar sandboxes más robustos
    const userFunction = new Function('return ' + code)();

    // Ejecutar la función de usuario
    let result;
    if (typeof userFunction === 'function') {
      result = userFunction();
    } else {
      result = userFunction;
    }

    // Enviar resultado exitoso al hilo principal
    self.postMessage({
      taskId: taskId,
      result: result,
      error: null
    });

  } catch (error) {
    // Capturar y enviar errores al hilo principal
    self.postMessage({
      taskId: taskId,
      result: null,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};
