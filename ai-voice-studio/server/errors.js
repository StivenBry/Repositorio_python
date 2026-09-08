/**
 * Errores de aplicacion con mensaje apto para el usuario final.
 *
 * Regla del proyecto (requisito 16): el navegador nunca recibe trazas,
 * nombres de proveedor internos ni fragmentos de credenciales. Cada error
 * viaja como `{ code, message, hint? }` en castellano claro.
 */

export class AppError extends Error {
  /**
   * @param {string} code      Codigo estable para el frontend (ej. TEXT_TOO_LONG).
   * @param {string} message   Mensaje legible para una persona no tecnica.
   * @param {object} [options]
   * @param {number} [options.status=400]  Codigo HTTP.
   * @param {string} [options.hint]        Sugerencia de como resolverlo.
   * @param {Error}  [options.cause]       Error original (solo para los logs).
   */
  constructor(code, message, { status = 400, hint = '', cause } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.hint = hint;
    this.expose = true;
    if (cause) this.cause = cause;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, hint: this.hint || undefined } };
  }
}

/** Atajos para los errores mas frecuentes del dominio. */
export const errors = {
  validation: (message, hint) => new AppError('VALIDATION_ERROR', message, { status: 400, hint }),

  emptyScript: () =>
    new AppError('EMPTY_SCRIPT', 'El guion esta vacio.', {
      status: 400,
      hint: 'Escribe o pega un texto antes de continuar.',
    }),

  textTooLong: (length, max) =>
    new AppError(
      'TEXT_TOO_LONG',
      `El guion es demasiado largo (${length.toLocaleString('es')} caracteres). El maximo permitido es ${max.toLocaleString('es')}.`,
      { status: 413, hint: 'Divide el guion en varias partes y genera cada una por separado.' },
    ),

  notFound: (what = 'El recurso solicitado') =>
    new AppError('NOT_FOUND', `${what} no existe o ya fue eliminado.`, { status: 404 }),

  providerNotConfigured: (kind) =>
    new AppError(
      'PROVIDER_NOT_CONFIGURED',
      kind === 'tts'
        ? 'El servicio de voz no esta configurado en el servidor.'
        : 'El servicio de inteligencia artificial no esta configurado en el servidor.',
      {
        status: 503,
        hint: 'Un administrador debe anadir la clave correspondiente en el archivo .env y reiniciar la aplicacion.',
      },
    ),

  providerUnavailable: (cause) =>
    new AppError('PROVIDER_UNAVAILABLE', 'El servicio de voz no responde en este momento.', {
      status: 502,
      hint: 'Vuelve a intentarlo en unos segundos. Si continua, prueba con otra voz o proveedor.',
      cause,
    }),

  providerRejected: (message, cause) =>
    new AppError('PROVIDER_REJECTED', message || 'El servicio de voz rechazo la peticion.', {
      status: 502,
      hint: 'Revisa la voz seleccionada y la longitud del guion.',
      cause,
    }),

  quotaExceeded: () =>
    new AppError('QUOTA_EXCEEDED', 'Se agoto la cuota disponible del servicio de voz.', {
      status: 429,
      hint: 'Espera unos minutos o revisa el plan contratado con el proveedor.',
    }),

  network: (cause) =>
    new AppError('NETWORK_ERROR', 'No se pudo conectar con el servicio externo.', {
      status: 504,
      hint: 'Comprueba la conexion a internet del servidor e intentalo de nuevo.',
      cause,
    }),

  generationFailed: (cause) =>
    new AppError('GENERATION_FAILED', 'No se pudo generar el audio de la narracion.', {
      status: 500,
      hint: 'Intenta de nuevo. Si el problema persiste, simplifica el guion o cambia de voz.',
      cause,
    }),

  conversionUnavailable: (format) =>
    new AppError(
      'CONVERSION_UNAVAILABLE',
      `No es posible entregar el audio en formato ${String(format).toUpperCase()} con la configuracion actual.`,
      {
        status: 409,
        hint: 'Descarga el otro formato disponible o instala ffmpeg en el servidor.',
      },
    ),

  rateLimited: (retryAfterSeconds) =>
    new AppError('RATE_LIMITED', 'Has realizado demasiadas peticiones seguidas.', {
      status: 429,
      hint: `Espera ${retryAfterSeconds} segundos antes de volver a intentarlo.`,
    }),

  internal: (cause) =>
    new AppError('INTERNAL_ERROR', 'Ocurrio un error inesperado.', {
      status: 500,
      hint: 'Vuelve a intentarlo. Si el problema continua, avisa al administrador.',
      cause,
    }),
};

/**
 * Normaliza cualquier excepcion a un AppError seguro para el cliente.
 * Los errores desconocidos se convierten en INTERNAL_ERROR para no filtrar
 * detalles de implementacion.
 */
export function toAppError(error) {
  if (error instanceof AppError) return error;
  if (error?.name === 'AbortError') {
    return new AppError('TIMEOUT', 'El servicio tardo demasiado en responder.', {
      status: 504,
      hint: 'Prueba con un guion mas corto o vuelve a intentarlo.',
      cause: error,
    });
  }
  if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
    return errors.network(error);
  }
  return errors.internal(error);
}

/** Elimina posibles claves de un texto antes de escribirlo en los logs. */
export function redact(text = '') {
  return String(text)
    .replace(/(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, '$1***')
    .replace(/(xi-api-key\s*:\s*)\S+/gi, '$1***')
    .replace(/([?&](?:key|api_key|access_token)=)[^&\s]+/gi, '$1***')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, '$1***');
}
