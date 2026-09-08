/**
 * Validacion y saneado de la entrada (requisito 17).
 *
 * Regla: nada de lo que llega del navegador se usa tal cual. El texto se
 * limpia, los numeros se recortan a su rango y los identificadores se validan
 * con una expresion regular antes de tocar el disco.
 */

import { config } from '../config.js';
import { errors } from '../errors.js';
import { sanitizeScript } from '../services/script/text.js';
import { normalizeControls } from '../services/script/director.js';
import { STYLE_IDS } from '../services/script/styles.js';

/**
 * Lee y valida el guion del cuerpo de la peticion.
 * @param {object} body
 * @param {object} [options]
 * @param {number} [options.max]        Limite de caracteres.
 * @param {boolean} [options.required]  Si puede venir vacio.
 */
export function readScript(body, { max = config.limits.maxScriptChars, required = true } = {}) {
  const raw = body?.script ?? body?.text ?? '';
  if (typeof raw !== 'string') throw errors.validation('El guion debe ser texto.');

  const script = sanitizeScript(raw);
  if (required && !script.trim()) throw errors.emptyScript();
  if (script.length > max) throw errors.textTooLong(script.length, max);

  return script;
}

/** Normaliza los ajustes de narracion que acompanan a cada peticion. */
export function readSettings(body = {}) {
  const styleId = STYLE_IDS.includes(body.styleId) ? body.styleId : 'natural';
  return {
    styleId,
    controls: normalizeControls(body.controls || {}),
    autoInterpret: body.autoInterpret !== false,
    voiceId: readVoiceId(body.voiceId),
    format: body.format === 'wav' ? 'wav' : config.audio.defaultFormat,
  };
}

/** Los identificadores de voz varian por proveedor: se acepta un juego seguro. */
export function readVoiceId(value) {
  if (typeof value !== 'string') return '';
  const clean = value.trim().slice(0, 120);
  return /^[A-Za-z0-9._-]+$/.test(clean) ? clean : '';
}

/** Nombre de proyecto o de archivo introducido por el usuario. */
export function readName(value, fallback = 'Narracion sin titulo') {
  if (typeof value !== 'string') return fallback;
  const clean = sanitizeScript(value).replace(/\s+/g, ' ').trim().slice(0, config.limits.maxProjectNameChars);
  return clean || fallback;
}

/** Comprueba que el cuerpo recibido sea un objeto JSON. */
export function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw errors.validation('El formato de la peticion no es valido.');
  }
  return body;
}
