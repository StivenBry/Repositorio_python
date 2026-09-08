/**
 * Marcadores de interpretacion dentro del guion (requisito 6).
 *
 * El usuario puede escribir instrucciones entre corchetes:
 *
 *   [PAUSA]  [PAUSA CORTA]  [PAUSA LARGA]  [PAUSA: 1.5s]
 *   [ENFASIS]texto muy importante[/ENFASIS]
 *   [ENFASIS: una sola frase]
 *   [EMOCION: FELIZ]   [EMOCION: TRISTE]   [EMOCION: NEUTRAL]
 *   [TONO: MISTERIOSO] [VELOCIDAD: LENTA]  [VOLUMEN: ALTO]
 *
 * Reglas:
 *  - Los marcadores reconocidos NUNCA se pronuncian: se extraen del texto y
 *    se convierten en instrucciones para el motor de voz.
 *  - Los corchetes que no coinciden con ningun comando conocido se respetan
 *    como texto del usuario y se reportan como aviso, por si hubo una errata.
 *  - Se aceptan variantes con o sin tilde y en ingles.
 */

import { normalizeKey } from './text.js';

const MARKER_RE = /\[\s*(\/?)\s*([\p{L} ]{2,20}?)\s*(?::\s*([^\]]{0,80}?)\s*)?\]/gu;

/** Familias de comandos y sus sinonimos aceptados. */
const COMMANDS = {
  pause: ['pausa', 'pause', 'silencio', 'break', 'espera'],
  emphasis: ['enfasis', 'emphasis', 'destacar', 'importante'],
  emotion: ['emocion', 'emotion', 'sentimiento', 'animo'],
  tone: ['tono', 'tone'],
  rate: ['velocidad', 'speed', 'rate', 'ritmo'],
  volume: ['volumen', 'volume'],
};

/** Duraciones nombradas de las pausas, en milisegundos. */
const PAUSE_PRESETS = {
  '': 500,
  corta: 250,
  breve: 250,
  short: 250,
  media: 500,
  normal: 500,
  larga: 900,
  long: 900,
  grande: 900,
  'muy larga': 1500,
  'extra larga': 1500,
  dramatica: 1200,
  dramatic: 1200,
};

/** Emociones reconocidas -> etiqueta interna del motor. */
const EMOTIONS = {
  neutral: 'neutral', normal: 'neutral', neutro: 'neutral',
  feliz: 'joy', alegre: 'joy', happy: 'joy', joy: 'joy', contento: 'joy',
  triste: 'sadness', sad: 'sadness', sadness: 'sadness', melancolico: 'sadness',
  enojado: 'anger', enfadado: 'anger', angry: 'anger', furioso: 'anger', anger: 'anger',
  tenso: 'tension', tension: 'tension', miedo: 'tension', fear: 'tension', suspenso: 'tension',
  sorpresa: 'awe', asombro: 'awe', surprise: 'awe', awe: 'awe', admiracion: 'awe',
  calma: 'calm', calmado: 'calm', sereno: 'calm', calm: 'calm', relajado: 'calm',
  urgente: 'urgency', urgencia: 'urgency', urgency: 'urgency', prisa: 'urgency',
  inspirador: 'hope', esperanza: 'hope', hope: 'hope', motivador: 'hope',
};

/** Tonos reconocidos -> ajuste fino de tono y ritmo. */
const TONES = {
  misterioso: { pitch: -0.18, rate: 0.9, emotion: 'tension' },
  mysterious: { pitch: -0.18, rate: 0.9, emotion: 'tension' },
  dramatico: { pitch: -0.08, rate: 0.88, emotion: 'tension' },
  dramatic: { pitch: -0.08, rate: 0.88, emotion: 'tension' },
  serio: { pitch: -0.1, rate: 0.95, emotion: 'neutral' },
  serious: { pitch: -0.1, rate: 0.95, emotion: 'neutral' },
  calido: { pitch: 0.04, rate: 0.97, emotion: 'calm' },
  warm: { pitch: 0.04, rate: 0.97, emotion: 'calm' },
  alegre: { pitch: 0.12, rate: 1.06, emotion: 'joy' },
  cheerful: { pitch: 0.12, rate: 1.06, emotion: 'joy' },
  epico: { pitch: -0.05, rate: 0.92, emotion: 'awe' },
  epic: { pitch: -0.05, rate: 0.92, emotion: 'awe' },
  intimo: { pitch: -0.06, rate: 0.9, emotion: 'calm' },
  intimate: { pitch: -0.06, rate: 0.9, emotion: 'calm' },
  profesional: { pitch: 0, rate: 1, emotion: 'neutral' },
  professional: { pitch: 0, rate: 1, emotion: 'neutral' },
};

/** Velocidades nombradas -> factor multiplicador. */
const RATES = {
  'muy lenta': 0.72, 'muy lento': 0.72, 'very slow': 0.72,
  lenta: 0.85, lento: 0.85, slow: 0.85, pausada: 0.85,
  normal: 1, media: 1, medium: 1,
  rapida: 1.18, rapido: 1.18, fast: 1.18, agil: 1.18,
  'muy rapida': 1.35, 'muy rapido': 1.35, 'very fast': 1.35,
};

/** Volumenes nombrados -> factor multiplicador. */
const VOLUMES = {
  susurro: 0.55, whisper: 0.55,
  bajo: 0.75, low: 0.75, suave: 0.75, soft: 0.75,
  normal: 1, medio: 1, medium: 1,
  alto: 1.2, high: 1.2, fuerte: 1.2, loud: 1.2,
};

function commandOf(name) {
  const key = normalizeKey(name);
  for (const [command, aliases] of Object.entries(COMMANDS)) {
    for (const alias of aliases) {
      if (key === alias || key.startsWith(`${alias} `)) {
        return { command, modifier: key.slice(alias.length).trim() };
      }
    }
  }
  return null;
}

/** Interpreta "1.5s", "800ms", "800" o un nombre como "larga". */
function parsePauseValue(modifier, value) {
  const raw = (value || modifier || '').trim();
  if (!raw) return PAUSE_PRESETS[normalizeKey(modifier)] ?? PAUSE_PRESETS[''];
  const numeric = raw.match(/^(\d+(?:[.,]\d+)?)\s*(ms|s|seg|segundos?)?$/i);
  if (numeric) {
    const amount = Number.parseFloat(numeric[1].replace(',', '.'));
    const unit = (numeric[2] || 'ms').toLowerCase();
    const ms = unit === 'ms' ? amount : amount * 1000;
    return Math.min(5000, Math.max(50, Math.round(ms)));
  }
  return PAUSE_PRESETS[normalizeKey(raw)] ?? PAUSE_PRESETS[''];
}

function parseNumericOr(map, raw, fallback) {
  const key = normalizeKey(raw);
  if (key in map) return map[key];
  const numeric = Number.parseFloat(String(raw).replace(',', '.'));
  if (Number.isFinite(numeric) && numeric > 0 && numeric <= 3) return numeric;
  return fallback;
}

/** Estado inicial (sin ninguna directiva activa). */
function baseState() {
  return { emotion: null, tone: null, rateFactor: 1, volumeFactor: 1, pitchOffset: 0 };
}

/**
 * Analiza el guion y separa el texto hablado de las instrucciones.
 *
 * @param {string} source Guion tal cual lo escribio el usuario.
 * @returns {{
 *   cleanText: string,
 *   tokens: Array<object>,
 *   markers: Array<object>,
 *   unknown: Array<{raw: string, index: number}>,
 *   hasMarkers: boolean
 * }}
 */
export function parseMarkers(source = '') {
  const text = String(source);
  const tokens = [];
  const markers = [];
  const unknown = [];

  let clean = '';
  let cursor = 0;
  let emphasisDepth = 0;
  let state = baseState();
  const stateStack = [];

  const pushText = (chunk) => {
    if (!chunk) return;
    const start = clean.length;
    clean += chunk;
    tokens.push({
      type: 'text',
      value: chunk,
      start,
      end: clean.length,
      emphasis: emphasisDepth > 0,
      state: { ...state },
    });
  };

  MARKER_RE.lastIndex = 0;
  let match = MARKER_RE.exec(text);
  while (match !== null) {
    const [raw, closing, name, value] = match;
    const parsed = commandOf(name);

    if (!parsed) {
      // No es un comando conocido: se conserva como texto del usuario.
      unknown.push({ raw, index: match.index });
      pushText(text.slice(cursor, match.index + raw.length));
      cursor = match.index + raw.length;
      match = MARKER_RE.exec(text);
      continue;
    }

    pushText(text.slice(cursor, match.index));
    cursor = match.index + raw.length;

    const marker = { command: parsed.command, raw, sourceIndex: match.index, at: clean.length };

    if (closing) {
      // Cierre de un bloque: [/ENFASIS], [/TONO], [/EMOCION]...
      if (parsed.command === 'emphasis') {
        emphasisDepth = Math.max(0, emphasisDepth - 1);
      } else if (stateStack.length) {
        state = stateStack.pop();
      } else {
        state = baseState();
      }
      marker.closing = true;
      markers.push(marker);
      match = MARKER_RE.exec(text);
      continue;
    }

    switch (parsed.command) {
      case 'pause': {
        const ms = parsePauseValue(parsed.modifier, value);
        tokens.push({ type: 'pause', ms, at: clean.length });
        marker.ms = ms;
        break;
      }
      case 'emphasis': {
        if (value) {
          // Forma corta: [ENFASIS: texto] aplica solo a ese fragmento.
          emphasisDepth += 1;
          pushText(value);
          emphasisDepth -= 1;
          marker.inline = value;
        } else {
          emphasisDepth += 1;
          marker.opens = true;
        }
        break;
      }
      case 'emotion': {
        const key = normalizeKey(value || parsed.modifier);
        const emotion = EMOTIONS[key] ?? null;
        stateStack.push({ ...state });
        state = { ...state, emotion };
        marker.value = emotion;
        if (!emotion && key) unknown.push({ raw, index: match.index });
        break;
      }
      case 'tone': {
        const key = normalizeKey(value || parsed.modifier);
        const tone = TONES[key] ?? null;
        stateStack.push({ ...state });
        state = tone
          ? {
              ...state,
              tone: key,
              pitchOffset: state.pitchOffset + tone.pitch,
              rateFactor: state.rateFactor * tone.rate,
              emotion: state.emotion ?? tone.emotion,
            }
          : { ...state };
        marker.value = tone ? key : null;
        if (!tone && key) unknown.push({ raw, index: match.index });
        break;
      }
      case 'rate': {
        const factor = parseNumericOr(RATES, value || parsed.modifier, 1);
        stateStack.push({ ...state });
        state = { ...state, rateFactor: state.rateFactor * factor };
        marker.value = factor;
        break;
      }
      case 'volume': {
        const factor = parseNumericOr(VOLUMES, value || parsed.modifier, 1);
        stateStack.push({ ...state });
        state = { ...state, volumeFactor: state.volumeFactor * factor };
        marker.value = factor;
        break;
      }
      default:
        break;
    }

    markers.push(marker);
    match = MARKER_RE.exec(text);
  }

  pushText(text.slice(cursor));

  // Los marcadores dejan espacios dobles al desaparecer: se compactan sin
  // tocar los saltos de linea del usuario.
  const cleanText = clean
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n');

  return {
    cleanText,
    tokens,
    markers,
    unknown,
    hasMarkers: markers.length > 0,
  };
}

/** Devuelve la instruccion aplicable en una posicion del texto limpio. */
export function stateAt(tokens, offset) {
  let current = baseState();
  let emphasis = false;
  for (const token of tokens) {
    if (token.type !== 'text') continue;
    if (token.start <= offset && offset < token.end) {
      current = token.state;
      emphasis = token.emphasis;
      break;
    }
    if (token.start > offset) break;
    current = token.state;
  }
  return { ...current, emphasis };
}

export const MARKER_REFERENCE = [
  { syntax: '[PAUSA]', description: 'Silencio corto (medio segundo).' },
  { syntax: '[PAUSA CORTA]', description: 'Respiracion breve, 0,25 s.' },
  { syntax: '[PAUSA LARGA]', description: 'Silencio marcado, 0,9 s.' },
  { syntax: '[PAUSA: 1.5s]', description: 'Silencio con duracion exacta.' },
  { syntax: '[ENFASIS]...[/ENFASIS]', description: 'Resalta todo el fragmento.' },
  { syntax: '[ENFASIS: frase]', description: 'Resalta una frase concreta.' },
  { syntax: '[EMOCION: FELIZ]', description: 'Feliz, triste, tenso, calma, sorpresa, urgente...' },
  { syntax: '[TONO: MISTERIOSO]', description: 'Misterioso, dramatico, calido, epico, serio...' },
  { syntax: '[VELOCIDAD: LENTA]', description: 'Muy lenta, lenta, normal, rapida, muy rapida.' },
  { syntax: '[VOLUMEN: ALTO]', description: 'Susurro, bajo, normal, alto.' },
];

export const MARKER_VOCABULARY = { EMOTIONS, TONES, RATES, VOLUMES, PAUSE_PRESETS };
