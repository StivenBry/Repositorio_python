/**
 * "Director" de la narracion: convierte guion + analisis + ajustes del usuario
 * en un PLAN DE INTERPRETACION que cualquier proveedor TTS puede ejecutar.
 *
 * Es la pieza central del requisito 5 (interpretacion inteligente):
 *
 *   guion crudo
 *     -> parseMarkers()   separa texto hablado e instrucciones explicitas
 *     -> segment()        divide en parrafos y frases
 *     -> analisis IA      etiqueta cada frase (pregunta, enfasis, emocion...)
 *     -> buildPerformance() mezcla estilo + controles + analisis + marcadores
 *
 * Regla inviolable: el TEXTO nunca se modifica. Solo se anaden instrucciones
 * de interpretacion alrededor de las palabras del usuario.
 */

import { clamp, countWords, round } from './text.js';
import { parseMarkers } from './markers.js';
import { segment } from './segmenter.js';
import { getStyle } from './styles.js';
import { PUNCTUATION_PAUSE } from './stats.js';

/** Valores por defecto de los cinco controles de voz (requisito 4). */
export const DEFAULT_CONTROLS = {
  speed: 1,
  pitch: 0,
  volume: 1,
  intensity: 0.5,
  pauses: 1,
};

export const CONTROL_RANGES = {
  speed: { min: 0.5, max: 2, step: 0.05, unit: 'x', labels: ['0.5x', '2.0x'] },
  pitch: { min: -1, max: 1, step: 0.05, unit: '', labels: ['Bajo', 'Alto'] },
  volume: { min: 0.2, max: 1.5, step: 0.05, unit: '%', labels: ['Suave', 'Fuerte'] },
  intensity: { min: 0, max: 1, step: 0.05, unit: '', labels: ['Sobrio', 'Intenso'] },
  pauses: { min: 0.4, max: 2, step: 0.05, unit: '', labels: ['Seguidas', 'Amplias'] },
};

/**
 * Normaliza y recorta los controles recibidos del cliente.
 * Un valor que no sea un numero se descarta y se conserva el predeterminado:
 * recortarlo al minimo produciria, por ejemplo, un audio casi mudo.
 */
export function normalizeControls(input = {}) {
  const controls = { ...DEFAULT_CONTROLS };
  for (const [key, range] of Object.entries(CONTROL_RANGES)) {
    const value = Number(input[key]);
    if (input[key] === null || input[key] === '' || !Number.isFinite(value)) continue;
    controls[key] = clamp(value, range.min, range.max);
  }
  return controls;
}

/** Mezcla un factor del analisis segun la intensidad elegida por el usuario. */
function blend(factor, weight) {
  return 1 + (Number(factor || 1) - 1) * weight;
}

/** Estado de marcadores que aplica a un rango del texto limpio. */
function markerStateForRange(tokens, start, end) {
  let best = null;
  let bestOverlap = 0;
  let emphasis = false;

  for (const token of tokens) {
    if (token.type !== 'text') continue;
    const overlap = Math.min(token.end, end) - Math.max(token.start, start);
    if (overlap <= 0) continue;
    if (token.emphasis) emphasis = true;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = token.state;
    }
  }

  return {
    emotion: best?.emotion ?? null,
    tone: best?.tone ?? null,
    rateFactor: best?.rateFactor ?? 1,
    volumeFactor: best?.volumeFactor ?? 1,
    pitchOffset: best?.pitchOffset ?? 0,
    emphasis,
  };
}

/** Pausa base que corresponde al signo con el que termina la frase. */
function basePauseSeconds(sentence, isParagraphEnd) {
  const base = PUNCTUATION_PAUSE[sentence.terminator] ?? PUNCTUATION_PAUSE['.'];
  return isParagraphEnd ? base + PUNCTUATION_PAUSE.paragraph : base;
}

/**
 * Construye el plan de interpretacion.
 *
 * @param {object} params
 * @param {string} params.script        Guion original (con marcadores).
 * @param {object} [params.analysis]    Resultado del servicio de IA.
 * @param {string} [params.styleId]     Estilo de narracion.
 * @param {object} [params.controls]    Controles de voz.
 * @param {boolean} [params.autoInterpret=true]
 * @returns {object} plan
 */
export function buildPerformance({
  script = '',
  analysis = null,
  styleId = 'natural',
  controls: rawControls = {},
  autoInterpret = true,
} = {}) {
  const style = getStyle(styleId);
  const controls = normalizeControls(rawControls);
  const parsed = parseMarkers(script);
  const { sentences, paragraphs } = segment(parsed.cleanText);

  // Peso con el que se aplica la interpretacion automatica.
  const weight = autoInterpret ? clamp(controls.intensity * 1.5, 0, 1.5) : 0;

  const analysisBySentence = new Map();
  if (analysis?.sentences?.length) {
    for (const item of analysis.sentences) {
      if (Number.isInteger(item.index)) analysisBySentence.set(item.index, item);
    }
  }

  // Pausas explicitas: se asignan a la frase que las precede.
  const pauseTokens = parsed.tokens.filter((token) => token.type === 'pause');
  const explicitPause = new Map();
  let leadingSilenceMs = 0;
  for (const token of pauseTokens) {
    const owner = [...sentences].reverse().find((sentence) => sentence.end <= token.at);
    if (!owner) {
      leadingSilenceMs += token.ms;
      continue;
    }
    explicitPause.set(owner.index, (explicitPause.get(owner.index) || 0) + token.ms);
  }

  const segments = [];

  for (const sentence of sentences) {
    const hint = analysisBySentence.get(sentence.index) || {};
    const markerState = markerStateForRange(parsed.tokens, sentence.start, sentence.end);

    const rate = clamp(
      style.rate * controls.speed * blend(hint.rateFactor, weight) * markerState.rateFactor,
      CONTROL_RANGES.speed.min,
      CONTROL_RANGES.speed.max,
    );

    const pitch = clamp(
      style.pitch +
        controls.pitch * 0.5 +
        Number(hint.pitchFactor || 0) * weight +
        markerState.pitchOffset,
      -1,
      1,
    );

    const analysedEmphasis = clamp(Number(hint.emphasis || 0), 0, 1) * clamp(weight, 0, 1);
    const emphasis = clamp(
      Math.max(analysedEmphasis * style.emphasisStrength, markerState.emphasis ? 0.85 : 0),
      0,
      1,
    );

    const volume = clamp(
      style.volume * controls.volume * markerState.volumeFactor * (1 + emphasis * 0.14),
      CONTROL_RANGES.volume.min,
      1.6,
    );

    const paragraphEnd = Boolean(sentence.isParagraphEnd) && sentence.index !== sentences.length - 1;
    const automaticPauseMs =
      basePauseSeconds(sentence, paragraphEnd) * 1000 * style.pauseScale * controls.pauses +
      Number(hint.extraPauseMs || 0) * weight;

    const pauseAfterMs = Math.round(
      clamp(automaticPauseMs, 0, 4000) + (explicitPause.get(sentence.index) || 0),
    );

    const reasons = [];
    if (hint.kind && hint.kind !== 'statement') reasons.push(hint.kind);
    if (hint.topicShift) reasons.push('cambio-de-tema');
    if (hint.scene) reasons.push(`escena-${hint.scene}`);
    if (markerState.emphasis) reasons.push('enfasis-marcado');
    if (explicitPause.has(sentence.index)) reasons.push('pausa-marcada');
    if (markerState.emotion) reasons.push(`emocion-${markerState.emotion}`);

    segments.push({
      index: segments.length,
      sentenceIndex: sentence.index,
      paragraphIndex: sentence.paragraphIndex ?? 0,
      text: sentence.text,
      words: sentence.words ?? countWords(sentence.text),
      rate: round(rate, 3),
      pitch: round(pitch, 3),
      volume: round(volume, 3),
      emphasis: round(emphasis, 3),
      emotion: markerState.emotion || (autoInterpret ? hint.emotion || 'neutral' : 'neutral'),
      intensity: round(clamp(Number(hint.intensity ?? controls.intensity), 0, 1), 3),
      pauseAfterMs,
      importance: round(clamp(Number(hint.importance ?? 0.4), 0, 1), 2),
      emphasisWords: Array.isArray(hint.emphasisWords) ? hint.emphasisWords.slice(0, 6) : [],
      reasons,
      note: hint.note || '',
    });
  }

  // Las pausas "antes de" que propone el analisis se suman al final de la
  // frase anterior: asi el silencio cae justo antes del giro narrativo
  // (ej. "Pero entonces ocurrio algo inesperado.").
  if (weight > 0) {
    for (const item of segments) {
      const hint = analysisBySentence.get(item.sentenceIndex);
      const before = Math.round(Number(hint?.extraPauseBeforeMs || 0) * weight);
      if (before <= 0) continue;
      if (item.index === 0) {
        leadingSilenceMs += before;
      } else {
        const previous = segments[item.index - 1];
        previous.pauseAfterMs = Math.round(clamp(previous.pauseAfterMs + before, 0, 5000));
        if (!previous.reasons.includes('pausa-previa')) previous.reasons.push('pausa-previa');
      }
      item.pauseBeforeMs = before;
    }
  }

  // Duracion estimada a partir del plan real (mas fiable que la del editor).
  let estimatedSeconds = leadingSilenceMs / 1000;
  for (const item of segments) {
    const wpm = Math.max(60, style.wpm * item.rate);
    estimatedSeconds += (item.words / wpm) * 60 + item.pauseAfterMs / 1000;
  }

  return {
    styleId: style.id,
    styleLabel: style.label,
    autoInterpret: Boolean(autoInterpret),
    controls,
    language: analysis?.language || 'es',
    text: parsed.cleanText,
    leadingSilenceMs,
    segments,
    paragraphs: paragraphs.length,
    words: countWords(parsed.cleanText),
    estimatedSeconds: round(estimatedSeconds, 1),
    markers: {
      total: parsed.markers.length,
      unknown: parsed.unknown.map((item) => item.raw),
      list: parsed.markers.map((marker) => ({
        command: marker.command,
        value: marker.value ?? marker.ms ?? marker.inline ?? null,
        closing: Boolean(marker.closing),
      })),
    },
    warnings: parsed.unknown.length
      ? [
          `Se encontraron ${parsed.unknown.length} marcador(es) que no se reconocen y se leeran tal cual: ${parsed.unknown
            .map((item) => item.raw)
            .slice(0, 3)
            .join(', ')}`,
        ]
      : [],
  };
}
