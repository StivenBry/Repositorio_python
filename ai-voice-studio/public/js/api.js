/**
 * Cliente de la API.
 *
 * Un unico punto de entrada para todas las llamadas al servidor. Traduce
 * cualquier fallo (red, servidor, JSON invalido) a un `ApiError` con un
 * mensaje ya redactado en castellano, para que la interfaz nunca tenga que
 * mostrar un error tecnico (requisito 16).
 */

export class ApiError extends Error {
  constructor(message, { code = 'ERROR', hint = '', status = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.hint = hint;
    this.status = status;
  }
}

async function call(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('No se pudo conectar con el servidor.', {
      code: 'OFFLINE',
      hint: 'Revisa tu conexion y comprueba que la aplicacion siga en marcha.',
    });
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = payload?.error || {};
    throw new ApiError(error.message || 'No se pudo completar la operacion.', {
      code: error.code || 'ERROR',
      hint: error.hint || '',
      status: response.status,
    });
  }

  return payload;
}

export const api = {
  config: () => call('/api/config'),
  voices: (refresh = false) => call(`/api/voices${refresh ? '?refresh=1' : ''}`),

  stats: (body, signal) => call('/api/script/stats', { method: 'POST', body, signal }),
  analyze: (body, signal) => call('/api/script/analyze', { method: 'POST', body, signal }),
  optimize: (body) => call('/api/script/optimize', { method: 'POST', body }),
  shorts: (body, signal) => call('/api/script/shorts', { method: 'POST', body, signal }),

  generate: (body) => call('/api/tts/generate', { method: 'POST', body }),
  preview: (body) => call('/api/tts/preview', { method: 'POST', body }),

  listProjects: () => call('/api/projects'),
  getProject: (id) => call(`/api/projects/${id}`),
  createProject: (body) => call('/api/projects', { method: 'POST', body }),
  updateProject: (id, body) => call(`/api/projects/${id}`, { method: 'PUT', body }),
  deleteProject: (id) => call(`/api/projects/${id}`, { method: 'DELETE' }),
};
