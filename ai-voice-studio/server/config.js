/**
 * Carga y validacion de la configuracion.
 *
 * Toda la configuracion sensible (claves de API) vive aqui, en el proceso del
 * servidor. El frontend nunca recibe una clave: solo se le expone, mediante
 * `publicConfig()`, que proveedores estan disponibles.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..');

/**
 * Parser minimo de archivos `.env` (evita una dependencia externa).
 * Soporta `CLAVE=valor`, comentarios con `#`, comillas simples y dobles.
 */
function parseEnvFile(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Carga `.env` sin sobrescribir variables ya presentes en el entorno real. */
function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return false;
  const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const dotEnvLoaded = loadDotEnv();

const str = (key, fallback = '') => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : String(value).trim();
};

const int = (key, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const raw = process.env[key];
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const list = (key) =>
  str(key)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const TTS_PROVIDERS = ['mock', 'elevenlabs', 'openai', 'google', 'azure'];
const AI_PROVIDERS = ['heuristic', 'anthropic', 'openai', 'google'];
const STORAGE_DRIVERS = ['local', 'memory'];

const pick = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

const storageDirRaw = str('STORAGE_DIR', './data');

export const config = {
  dotEnvLoaded,
  env: str('NODE_ENV', 'development'),
  isProduction: str('NODE_ENV', 'development') === 'production',
  port: int('PORT', 3000, { min: 1, max: 65535 }),
  corsOrigins: list('CORS_ORIGINS'),

  limits: {
    maxScriptChars: int('MAX_SCRIPT_CHARS', 8000, { min: 200, max: 100000 }),
    maxPreviewChars: int('MAX_PREVIEW_CHARS', 320, { min: 40, max: 2000 }),
    maxProjectNameChars: 80,
    maxProjects: int('MAX_PROJECTS', 200, { min: 5, max: 5000 }),
    jsonBodyLimit: '1mb',
    rateWindowMs: int('RATE_LIMIT_WINDOW_MS', 60_000, { min: 1000 }),
    rateMaxRequests: int('RATE_LIMIT_MAX_REQUESTS', 120, { min: 5 }),
    rateHeavyMax: int('RATE_LIMIT_HEAVY_MAX', 15, { min: 1 }),
  },

  tts: {
    provider: pick(str('TTS_PROVIDER', 'mock').toLowerCase(), TTS_PROVIDERS, 'mock'),
    // Idioma con el que se filtra el catalogo de voces de los proveedores
    // que devuelven cientos de ellas (Google, Azure).
    language: str('TTS_LANGUAGE', str('GOOGLE_TTS_LANGUAGE', 'es-ES')),
    elevenlabs: {
      apiKey: str('ELEVENLABS_API_KEY'),
      modelId: str('ELEVENLABS_MODEL_ID', 'eleven_multilingual_v2'),
    },
    openai: {
      apiKey: str('OPENAI_API_KEY'),
      model: str('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts'),
    },
    google: {
      apiKey: str('GOOGLE_TTS_API_KEY'),
      language: str('GOOGLE_TTS_LANGUAGE', 'es-ES'),
    },

    azure: {
      apiKey: str('AZURE_SPEECH_KEY'),
      region: str('AZURE_SPEECH_REGION'),
    },
  },

  ai: {
    provider: pick(str('AI_PROVIDER', 'heuristic').toLowerCase(), AI_PROVIDERS, 'heuristic'),
    anthropic: {
      apiKey: str('ANTHROPIC_API_KEY'),
      model: str('ANTHROPIC_MODEL', 'claude-opus-5'),
    },
    openai: {
      apiKey: str('OPENAI_API_KEY'),
      model: str('OPENAI_AI_MODEL', 'gpt-4o-mini'),
    },
    google: {
      apiKey: str('GOOGLE_AI_API_KEY'),
      model: str('GOOGLE_AI_MODEL', 'gemini-2.0-flash'),
    },
  },

  storage: {
    driver: pick(str('STORAGE_DRIVER', 'local').toLowerCase(), STORAGE_DRIVERS, 'local'),
    dir: path.isAbsolute(storageDirRaw) ? storageDirRaw : path.resolve(ROOT_DIR, storageDirRaw),
    audioRetentionHours: int('AUDIO_RETENTION_HOURS', 72, { min: 1, max: 24 * 365 }),
  },

  audio: {
    defaultFormat: pick(str('DEFAULT_AUDIO_FORMAT', 'mp3').toLowerCase(), ['mp3', 'wav'], 'mp3'),
    ffmpegPath: str('FFMPEG_PATH'),
  },
};

/** Devuelve la clave configurada para un proveedor TTS, o cadena vacia. */
export function ttsCredential(provider = config.tts.provider) {
  switch (provider) {
    case 'elevenlabs':
      return config.tts.elevenlabs.apiKey;
    case 'openai':
      return config.tts.openai.apiKey;
    case 'google':
      return config.tts.google.apiKey;
    case 'azure':
      return config.tts.azure.apiKey && config.tts.azure.region
        ? config.tts.azure.apiKey
        : '';
    case 'mock':
      return 'offline';
    default:
      return '';
  }
}

/** Devuelve la clave configurada para un proveedor de IA, o cadena vacia. */
export function aiCredential(provider = config.ai.provider) {
  switch (provider) {
    case 'anthropic':
      return config.ai.anthropic.apiKey;
    case 'openai':
      return config.ai.openai.apiKey;
    case 'google':
      return config.ai.google.apiKey;
    case 'heuristic':
      return 'offline';
    default:
      return '';
  }
}

/**
 * Configuracion que SI puede viajar al navegador.
 * Contiene banderas y limites, jamas credenciales.
 */
export function publicConfig() {
  return {
    ttsProvider: config.tts.provider,
    ttsConfigured: Boolean(ttsCredential()),
    ttsProvidersAvailable: TTS_PROVIDERS.filter((p) => Boolean(ttsCredential(p))),
    aiProvider: config.ai.provider,
    aiConfigured: Boolean(aiCredential()),
    aiProvidersAvailable: AI_PROVIDERS.filter((p) => Boolean(aiCredential(p))),
    offlineMode: config.tts.provider === 'mock',
    limits: {
      maxScriptChars: config.limits.maxScriptChars,
      maxPreviewChars: config.limits.maxPreviewChars,
      maxProjectNameChars: config.limits.maxProjectNameChars,
    },
    defaultAudioFormat: config.audio.defaultFormat,
    version: '1.0.1',
  };
}

/**
 * Avisos de arranque: no detienen el servidor, pero explican en lenguaje
 * claro que faltaria para usar proveedores reales.
 */
export function startupWarnings() {
  const warnings = [];
  if (!ttsCredential()) {
    warnings.push(
      `El proveedor de voz "${config.tts.provider}" no tiene credenciales configuradas. ` +
        'Se usara el motor offline de demostracion. Revisa el archivo .env.',
    );
  }
  if (!aiCredential()) {
    warnings.push(
      `El proveedor de IA "${config.ai.provider}" no tiene credenciales configuradas. ` +
        'Se usara el analizador heuristico incluido.',
    );
  }
  if (config.isProduction && config.corsOrigins.length === 0) {
    warnings.push('CORS_ORIGINS vacio en produccion: solo se aceptaran peticiones del mismo origen.');
  }
  return warnings;
}

export { TTS_PROVIDERS, AI_PROVIDERS };
