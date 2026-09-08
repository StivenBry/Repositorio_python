/**
 * Cliente HTTP compartido por los proveedores externos (IA y TTS).
 *
 * Centraliza tiempo de espera, reintentos y traduccion de errores tecnicos a
 * mensajes comprensibles, para que ningun proveedor tenga que repetir esa
 * logica ni filtrar detalles internos al navegador (requisitos 15 y 16).
 */

import { AppError, errors } from '../errors.js';
import { logger } from '../logger.js';

const DEFAULT_TIMEOUT_MS = 60_000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Realiza una peticion con tiempo limite y reintentos exponenciales.
 *
 * @param {string} url
 * @param {object} [options]           Opciones de `fetch`.
 * @param {object} [settings]
 * @param {number} [settings.timeoutMs]
 * @param {number} [settings.retries]  Reintentos ante fallos transitorios.
 * @param {string} [settings.label]    Nombre legible del servicio, para logs.
 * @returns {Promise<Response>}
 */
export async function request(url, options = {}, settings = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 2, label = 'servicio externo' } = settings;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) return response;

      if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
        const wait = 400 * 2 ** attempt;
        logger.warn(`${label} respondio ${response.status}; reintentando en ${wait} ms`);
        await sleep(wait);
        continue;
      }

      throw await httpError(response, label);
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof AppError) throw error;

      lastError = error;
      const transient = error?.name === 'AbortError' || error?.name === 'TypeError';
      if (transient && attempt < retries) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      if (error?.name === 'AbortError') {
        throw new AppError('TIMEOUT', `El ${label} tardo demasiado en responder.`, {
          status: 504,
          hint: 'Prueba con un guion mas corto o intentalo de nuevo.',
          cause: error,
        });
      }
      throw errors.network(error);
    }
  }

  throw errors.network(lastError);
}

/** Traduce un codigo HTTP de proveedor a un AppError con mensaje claro. */
async function httpError(response, label) {
  let detail = '';
  try {
    detail = (await response.text()).slice(0, 600);
  } catch {
    detail = '';
  }
  logger.warn(`${label} devolvio ${response.status}`, { detail });

  switch (response.status) {
    case 401:
    case 403:
      return new AppError('PROVIDER_AUTH', `Las credenciales del ${label} no son validas.`, {
        status: 502,
        hint: 'Un administrador debe revisar la clave configurada en el archivo .env.',
      });
    case 404:
      return new AppError('PROVIDER_NOT_FOUND', `El ${label} no encontro la voz o el modelo solicitado.`, {
        status: 502,
        hint: 'Elige otra voz en el panel de configuracion.',
      });
    case 413:
      return new AppError('TEXT_TOO_LONG', 'El guion supera el tamano que admite el servicio de voz.', {
        status: 413,
        hint: 'Divide el guion en partes mas cortas.',
      });
    case 422:
      return new AppError('PROVIDER_REJECTED', `El ${label} rechazo el contenido enviado.`, {
        status: 502,
        hint: 'Revisa la voz elegida y los marcadores del guion.',
      });
    case 429:
      return errors.quotaExceeded();
    default:
      if (response.status >= 500) return errors.providerUnavailable();
      return errors.providerRejected(`El ${label} rechazo la peticion.`);
  }
}

/** Igual que `request`, pero devolviendo el JSON ya interpretado. */
export async function requestJson(url, options = {}, settings = {}) {
  const response = await request(url, options, settings);
  try {
    return await response.json();
  } catch (error) {
    throw errors.providerRejected(`La respuesta del ${settings.label || 'servicio'} no es valida.`, error);
  }
}

/** Igual que `request`, pero devolviendo los bytes del audio. */
export async function requestBuffer(url, options = {}, settings = {}) {
  const response = await request(url, options, settings);
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || '',
  };
}
