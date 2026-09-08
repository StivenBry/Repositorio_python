/**
 * Estadisticas del guion (requisito 12) y estimacion de duracion.
 *
 * Se calculan en el servidor para que el navegador y el motor de voz manejen
 * exactamente los mismos numeros, pero son lo bastante baratas como para
 * llamarse en cada pulsacion de tecla con "debounce".
 */

import { countWords, round } from './text.js';
import { parseMarkers } from './markers.js';
import { segment } from './segmenter.js';
import { getStyle } from './styles.js';

/** Pausas base, en segundos, que aporta la puntuacion al leer en voz alta. */
const PUNCTUATION_PAUSE = {
  '.': 0.42,
  '!': 0.46,
  '?': 0.46,
  ':': 0.32,
  ';': 0.3,
  ',': 0.16,
  '\n': 0.5,
  paragraph: 0.75,
};

/** Formatea segundos como "1 min 24 s" o "38 s". */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

/** Etiqueta cualitativa de la velocidad de lectura. */
export function speedLabel(wpm) {
  if (wpm < 120) return 'Muy pausada';
  if (wpm < 140) return 'Pausada';
  if (wpm < 165) return 'Natural';
  if (wpm < 185) return 'Agil';
  return 'Muy rapida';
}

/**
 * Calcula todas las estadisticas de un guion.
 *
 * @param {string} rawScript Guion con marcadores incluidos.
 * @param {object} [options]
 * @param {string} [options.styleId='natural']
 * @param {number} [options.speed=1]        Multiplicador del control de velocidad.
 * @param {number} [options.pauseScale=1]   Multiplicador del control de pausas.
 */
export function computeStats(rawScript = '', options = {}) {
  const { styleId = 'natural', speed = 1, pauseScale = 1 } = options;
  const style = getStyle(styleId);

  const parsed = parseMarkers(rawScript);
  const cleanText = parsed.cleanText;
  const { sentences, paragraphs } = segment(cleanText);

  const characters = cleanText.length;
  const charactersWithMarkers = String(rawScript).length;
  const charactersNoSpaces = cleanText.replace(/\s/g, '').length;
  const wordCount = countWords(cleanText);

  // Velocidad efectiva en palabras por minuto.
  const effectiveWpm = Math.max(60, style.wpm * (Number(speed) || 1));
  const speechSeconds = wordCount > 0 ? (wordCount / effectiveWpm) * 60 : 0;

  // Pausas derivadas de la puntuacion.
  let pauseSeconds = 0;
  for (const sentence of sentences) {
    pauseSeconds += PUNCTUATION_PAUSE[sentence.terminator] ?? PUNCTUATION_PAUSE['.'];
    const inner = sentence.text.match(/[,;:]/g);
    if (inner) {
      for (const sign of inner) pauseSeconds += PUNCTUATION_PAUSE[sign] ?? 0.15;
    }
  }
  pauseSeconds += Math.max(0, paragraphs.length - 1) * PUNCTUATION_PAUSE.paragraph;
  pauseSeconds *= style.pauseScale * (Number(pauseScale) || 1);

  // Pausas explicitas escritas por el usuario con marcadores.
  const markerPauseSeconds =
    parsed.tokens
      .filter((token) => token.type === 'pause')
      .reduce((total, token) => total + token.ms, 0) / 1000;

  const estimatedSeconds = speechSeconds + pauseSeconds + markerPauseSeconds;
  const sentenceWords = sentences.map((sentence) => sentence.words);

  return {
    characters,
    charactersWithMarkers,
    charactersNoSpaces,
    words: wordCount,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    markers: parsed.markers.length,
    unknownMarkers: parsed.unknown.length,
    estimatedSeconds: round(estimatedSeconds, 1),
    estimatedDuration: formatDuration(estimatedSeconds),
    wordsPerMinute: Math.round(effectiveWpm),
    speedLabel: speedLabel(effectiveWpm),
    averageWordsPerSentence: sentences.length ? round(wordCount / sentences.length, 1) : 0,
    longestSentenceWords: sentenceWords.length ? Math.max(...sentenceWords) : 0,
    speechSeconds: round(speechSeconds, 1),
    pauseSeconds: round(pauseSeconds + markerPauseSeconds, 1),
  };
}

/**
 * Analisis especifico para Shorts / Reels / TikTok (requisito 11).
 * Devuelve la duracion estimada y sugerencias accionables sobre el guion.
 */
export function shortsReport(rawScript = '', options = {}) {
  const stats = computeStats(rawScript, { ...options, styleId: options.styleId || 'energetico' });
  const parsed = parseMarkers(rawScript);
  const { sentences } = segment(parsed.cleanText);

  const target = Number(options.targetSeconds) || 45;
  const suggestions = [];

  const hook = sentences[0]?.text || '';
  const hookWords = sentences[0]?.words || 0;
  const hookIsQuestion = /[?]/.test(hook);
  const hookHasNumber = /\d/.test(hook);
  const hookOk = hookWords > 0 && hookWords <= 14 && (hookIsQuestion || hookHasNumber || hookWords <= 9);

  suggestions.push({
    id: 'hook',
    level: hookOk ? 'ok' : 'warn',
    title: 'Gancho inicial',
    detail: hookOk
      ? 'La primera frase es corta y directa: buen gancho para los tres primeros segundos.'
      : 'Empieza con una frase de 6 a 12 palabras que provoque curiosidad, plantee una pregunta o dé un dato sorprendente.',
    sample: hook.slice(0, 120),
  });

  const longSentences = sentences.filter((sentence) => sentence.words > 18);
  suggestions.push({
    id: 'frases-cortas',
    level: longSentences.length === 0 ? 'ok' : 'warn',
    title: 'Frases cortas',
    detail:
      longSentences.length === 0
        ? 'Todas las frases son breves; el ritmo se mantendra alto.'
        : `Hay ${longSentences.length} frase(s) de mas de 18 palabras. Partelas en dos para no perder ritmo.`,
    items: longSentences.slice(0, 3).map((sentence) => sentence.text.slice(0, 90)),
  });

  const pausesPer100Words = stats.words ? (stats.markers / stats.words) * 100 : 0;
  suggestions.push({
    id: 'ritmo',
    level: stats.wordsPerMinute >= 155 ? 'ok' : 'info',
    title: 'Ritmo dinamico',
    detail:
      stats.wordsPerMinute >= 155
        ? 'La velocidad estimada encaja con el formato vertical.'
        : 'Sube la velocidad o elige el estilo Energetico: en vertical funciona mejor por encima de 160 palabras por minuto.',
  });

  suggestions.push({
    id: 'pausas',
    level: pausesPer100Words >= 1 ? 'ok' : 'info',
    title: 'Pausas y enfasis',
    detail:
      pausesPer100Words >= 1
        ? 'Ya hay pausas marcadas que ayudan a respirar el mensaje.'
        : 'Anade [PAUSA] antes de la frase clave y [ENFASIS] en la palabra que quieres que se recuerde.',
  });

  const overBy = stats.estimatedSeconds - target;
  suggestions.push({
    id: 'duracion',
    level: Math.abs(overBy) <= target * 0.2 ? 'ok' : 'warn',
    title: 'Duracion',
    detail:
      overBy > target * 0.2
        ? `Te pasas unos ${Math.round(overBy)} s del objetivo de ${target} s: recorta alrededor de ${Math.max(
            1,
            Math.round((overBy / 60) * stats.wordsPerMinute),
          )} palabras.`
        : overBy < -target * 0.2
          ? `Te faltan unos ${Math.round(-overBy)} s para llegar a ${target} s: puedes ampliar el desarrollo o el cierre.`
          : `La duracion encaja con el objetivo de ${target} s.`,
  });

  return {
    stats,
    targetSeconds: target,
    estimatedSeconds: stats.estimatedSeconds,
    estimatedDuration: stats.estimatedDuration,
    words: stats.words,
    hook: hook.slice(0, 200),
    suggestions,
  };
}

export { PUNCTUATION_PAUSE };
