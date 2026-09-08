/**
 * Capa de abstraccion "TTS Service" (requisitos 14 y 15).
 *
 * El resto de la aplicacion solo usa `listVoices()` y `synthesize()`. Cambiar
 * de proveedor es cambiar `TTS_PROVIDER` en el .env; anadir uno nuevo es
 * escribir una clase que herede de `TtsProvider` y registrarla aqui.
 */

import { config, ttsCredential } from '../../config.js';
import { errors } from '../../errors.js';
import { logger } from '../../logger.js';
import { getStyle } from '../script/styles.js';
import { ensureFormat, availableFormats } from '../audio/convert.js';
import { MockTtsProvider } from './mock.provider.js';
import { ElevenLabsTtsProvider } from './elevenlabs.provider.js';
import { OpenAiTtsProvider } from './openai.provider.js';
import { GoogleTtsProvider } from './google.provider.js';
import { AzureTtsProvider } from './azure.provider.js';

const FACTORIES = {
  mock: () => new MockTtsProvider(),
  elevenlabs: () => new ElevenLabsTtsProvider(),
  openai: () => new OpenAiTtsProvider(),
  google: () => new GoogleTtsProvider(),
  azure: () => new AzureTtsProvider(),
};

const cache = new Map();

/** Devuelve (y memoriza) la instancia del proveedor solicitado. */
export function getTtsProvider(id = config.tts.provider) {
  const key = FACTORIES[id] ? id : 'mock';
  if (!cache.has(key)) cache.set(key, FACTORIES[key]());
  return cache.get(key);
}

/**
 * Proveedor efectivo. Si el configurado no tiene credenciales, se usa el
 * motor de demostracion en lugar de dejar la aplicacion inservible.
 */
export function activeTtsProvider() {
  const id = config.tts.provider;
  if (id !== 'mock' && !ttsCredential(id)) return getTtsProvider('mock');
  return getTtsProvider(id);
}

/** Cache corta del catalogo de voces, para no repetir llamadas externas. */
let voiceCache = { at: 0, provider: '', voices: null };
const VOICES_TTL_MS = 10 * 60 * 1000;

/** Catalogo de voces del proveedor activo (requisito 2). */
export async function listVoices({ force = false } = {}) {
  const provider = activeTtsProvider();
  const fresh =
    !force && voiceCache.voices && voiceCache.provider === provider.id && Date.now() - voiceCache.at < VOICES_TTL_MS;
  if (fresh) return voiceCache.voices;

  try {
    const voices = await provider.listVoices();
    if (!voices.length) throw errors.providerRejected('El servicio de voz no devolvio ninguna voz.');
    voiceCache = { at: Date.now(), provider: provider.id, voices };
    return voices;
  } catch (error) {
    if (provider.id === 'mock') throw error;
    logger.warn(`No se pudo leer el catalogo de "${provider.id}"; se muestran las voces de demostracion.`, {
      code: error?.code,
    });
    const fallback = await getTtsProvider('mock').listVoices();
    return fallback.map((voice) => ({ ...voice, fallback: true }));
  }
}

/**
 * Genera el audio de la narracion a partir del plan de interpretacion.
 *
 * @param {object} plan
 * @param {object} options { voiceId, format }
 * @returns {Promise<{buffer:Buffer,format:string,durationSeconds:number,provider:string,notes:string[]}>}
 */
export async function synthesize(plan, { voiceId, format = config.audio.defaultFormat } = {}) {
  const provider = activeTtsProvider();
  const style = getStyle(plan.styleId);
  const wanted = format === 'wav' ? 'wav' : 'mp3';

  const result = await provider.synthesize(plan, { voiceId, format: wanted, style });

  // Red de seguridad: si el proveedor devolvio otro formato, se convierte.
  let buffer = result.buffer;
  let finalFormat = result.format;
  const notes = [...(result.notes || [])];

  if (finalFormat !== wanted) {
    const converted = await ensureFormat(buffer, finalFormat, wanted);
    buffer = converted.buffer;
    finalFormat = converted.format;
    if (converted.converted) notes.push(`El audio se convirtio a ${wanted.toUpperCase()} en el servidor.`);
  }

  if (!buffer?.length) throw errors.generationFailed();

  return {
    buffer,
    format: finalFormat,
    durationSeconds: result.durationSeconds || 0,
    sampleRate: result.sampleRate || 0,
    provider: provider.id,
    notes,
  };
}

/** Informacion del motor de voz para la interfaz (sin credenciales). */
export function ttsInfo() {
  const provider = activeTtsProvider();
  const formats = availableFormats();
  return {
    provider: config.tts.provider,
    effective: provider.id,
    configured: Boolean(ttsCredential()),
    capabilities: provider.capabilities,
    downloadFormats: {
      mp3: true,
      // WAV es posible si el proveedor lo entrega de forma nativa o si hay ffmpeg.
      wav: provider.capabilities.formats.includes('wav') || formats.ffmpeg,
    },
    ffmpeg: formats.ffmpeg,
  };
}
