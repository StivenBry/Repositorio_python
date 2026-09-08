/**
 * Motor de IA "heuristico": analiza e interpreta el guion SIN conexion y SIN
 * ninguna clave de API. Es el proveedor por defecto y, ademas, la red de
 * seguridad cuando un proveedor externo falla.
 *
 * Cubre el requisito 5 (interpretacion inteligente) detectando:
 *   preguntas, exclamaciones, frases importantes, cambios de tema,
 *   inicio y final de escena, enfasis, pausas y cambios emocionales.
 *
 * Y el requisito 7 (optimizador) con transformaciones deterministas que
 * NUNCA inventan contenido: puntuacion, division de frases largas, marcadores
 * de pausa y enfasis, y expansion de abreviaturas para que el TTS las lea bien.
 */

import { clamp, countWords, deburr, round, words as tokenize } from '../script/text.js';
import { segment } from '../script/segmenter.js';
import { parseMarkers } from '../script/markers.js';
import {
  EMOTION_LEXICON,
  EMOTION_PROSODY,
  LANGUAGE_HINTS,
  REVEAL,
  STOPWORDS,
  TOPIC_SHIFT,
  TTS_EXPANSIONS,
} from './lexicon.js';

const REVEAL_SET = new Set(REVEAL);
const EMOTION_INDEX = new Map();
for (const [emotion, list] of Object.entries(EMOTION_LEXICON)) {
  for (const word of list) {
    if (!EMOTION_INDEX.has(word)) EMOTION_INDEX.set(word, []);
    EMOTION_INDEX.get(word).push(emotion);
  }
}

/** Detecta el idioma dominante comparando palabras funcionales. */
export function detectLanguage(text = '') {
  const list = tokenize(text);
  if (!list.length) return 'es';
  const counts = { es: 0, en: 0 };
  const sets = {
    es: new Set(LANGUAGE_HINTS.es),
    en: new Set(LANGUAGE_HINTS.en),
  };
  for (const word of list) {
    if (sets.es.has(word)) counts.es += 1;
    if (sets.en.has(word)) counts.en += 1;
  }
  return counts.en > counts.es * 1.3 ? 'en' : 'es';
}

/** Clasifica el tipo de frase. */
function detectKind(text) {
  const trimmed = text.trim();
  if (/^[-–—]\s|^"|^«/.test(trimmed)) return 'dialogue';
  if (/^(\d+[.)]|[•*-])\s/.test(trimmed)) return 'list-item';
  if (/[?]\s*$/.test(trimmed) || /^¿/.test(trimmed)) return 'question';
  if (/[!]\s*$/.test(trimmed) || /^¡/.test(trimmed)) return 'exclamation';
  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 3 && letters === letters.toUpperCase() && countWords(trimmed) <= 8) {
    return 'heading';
  }
  return 'statement';
}

/** Puntua las familias emocionales presentes en una frase. */
function detectEmotion(text) {
  const list = tokenize(text);
  const scores = new Map();
  for (const word of list) {
    const families = EMOTION_INDEX.get(word);
    if (!families) continue;
    for (const family of families) {
      scores.set(family, (scores.get(family) || 0) + 1);
    }
  }
  if (!scores.size) return { emotion: 'neutral', intensity: 0.35, matches: 0 };

  let emotion = 'neutral';
  let best = 0;
  for (const [family, score] of scores) {
    if (score > best) {
      best = score;
      emotion = family;
    }
  }
  const density = list.length ? best / Math.sqrt(list.length) : 0;
  return { emotion, intensity: clamp(0.4 + density * 0.55, 0.35, 1), matches: best };
}

/** Detecta si la frase abre un giro o un cambio de tema. */
function detectTopicShift(text) {
  const normalized = deburr(text).toLowerCase().trim();
  for (const connector of TOPIC_SHIFT) {
    if (normalized.startsWith(`${connector} `) || normalized.startsWith(`${connector},`)) {
      return connector;
    }
  }
  return null;
}

/** Palabras o expresiones que conviene resaltar dentro de la frase. */
function findEmphasisWords(text) {
  const found = new Set();

  // Cifras, porcentajes y anyos: siempre destacan al escuchar.
  for (const match of text.matchAll(/\d[\d.,]*\s?(?:%|por ciento|millones?|mil|anos?|km|kg|horas?)?/gi)) {
    const value = match[0].trim();
    if (value.length >= 1) found.add(value);
  }
  // Mayusculas sostenidas escritas a proposito por el usuario.
  for (const match of text.matchAll(/\b[\p{Lu}]{3,}\b/gu)) found.add(match[0]);
  // Fragmentos entrecomillados.
  for (const match of text.matchAll(/"([^"]{2,40})"/g)) found.add(match[1]);
  // Palabras del lexico de revelacion y superlativos.
  for (const match of text.matchAll(/[\p{L}]{3,}/gu)) {
    const normalized = deburr(match[0]).toLowerCase();
    if (REVEAL_SET.has(normalized) || /isim[oa]s?$/.test(normalized)) found.add(match[0]);
  }

  return [...found].slice(0, 6);
}

/**
 * Analiza el guion completo y devuelve el mapa de interpretacion.
 *
 * @param {string} rawScript
 * @param {object} [options]
 * @returns {object} analisis compatible con `buildPerformance()`
 */
export function analyzeHeuristic(rawScript = '', options = {}) {
  const parsed = parseMarkers(rawScript);
  const text = parsed.cleanText;
  const { sentences, paragraphs } = segment(text);
  const language = options.language || detectLanguage(text);
  const totalSentences = sentences.length;

  const analysed = sentences.map((sentence) => {
    const kind = detectKind(sentence.text);
    const { emotion, intensity, matches } = detectEmotion(sentence.text);
    const shift = detectTopicShift(sentence.text);
    const emphasisWords = findEmphasisWords(sentence.text);
    const prosody = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;

    const isFirst = sentence.index === 0;
    const isLast = sentence.index === totalSentences - 1;
    const isShort = sentence.words > 0 && sentence.words <= 7;

    // --- Importancia: cuanto pesa esta frase dentro del guion ---------------
    let importance = 0.35;
    if (isFirst) importance += 0.3;
    if (isLast) importance += 0.25;
    if (shift) importance += 0.18;
    if (kind === 'question') importance += 0.15;
    if (kind === 'exclamation') importance += 0.18;
    if (kind === 'heading') importance += 0.25;
    if (emphasisWords.length) importance += Math.min(0.2, emphasisWords.length * 0.07);
    if (isShort && !isFirst) importance += 0.1;
    if (matches >= 2) importance += 0.1;
    importance = clamp(importance, 0, 1);

    // --- Enfasis, ritmo y tono ---------------------------------------------
    let emphasis = clamp(prosody.emphasis + importance * 0.45, 0, 1);
    let rateFactor = prosody.rateFactor;
    let pitchFactor = prosody.pitchFactor;
    let extraPauseMs = 0;
    let extraPauseBeforeMs = prosody.pauseBefore;
    const notes = [];

    if (kind === 'question') {
      pitchFactor += 0.12;
      rateFactor *= 0.98;
      extraPauseMs += 140;
      notes.push('Pregunta: entonacion ascendente al final.');
    }
    if (kind === 'exclamation') {
      pitchFactor += 0.08;
      rateFactor *= 1.04;
      emphasis = clamp(emphasis + 0.25, 0, 1);
      extraPauseMs += 160;
      notes.push('Exclamacion: mas energia y remate marcado.');
    }
    if (kind === 'heading') {
      rateFactor *= 0.9;
      extraPauseMs += 320;
      emphasis = clamp(emphasis + 0.3, 0, 1);
      notes.push('Titulo o rotulo: se lee mas despacio y se separa.');
    }
    if (kind === 'dialogue') {
      pitchFactor += 0.05;
      notes.push('Dialogo: registro mas cercano.');
    }
    if (shift) {
      extraPauseBeforeMs += 260;
      rateFactor *= 0.95;
      emphasis = clamp(emphasis + 0.2, 0, 1);
      notes.push(`Giro narrativo tras "${shift}": pequena pausa antes y mas peso.`);
    }
    if (isFirst) {
      rateFactor *= 0.97;
      extraPauseMs += 180;
      notes.push('Frase de apertura: marca el tono de toda la narracion.');
    }
    if (isLast) {
      rateFactor *= 0.93;
      emphasis = clamp(emphasis + 0.2, 0, 1);
      notes.push('Cierre: se baja el ritmo para rematar.');
    }
    if (sentence.isParagraphEnd && !isLast) {
      extraPauseMs += 220;
    }
    if (sentence.isParagraphStart && sentence.paragraphIndex > 0) {
      notes.push('Inicio de bloque: nueva idea.');
    }
    if (sentence.words > 30) {
      rateFactor *= 0.97;
      notes.push('Frase muy larga: conviene dividirla para respirar.');
    }

    let scene = null;
    if (sentence.isParagraphStart && sentence.paragraphIndex === 0) scene = 'start';
    else if (isLast) scene = 'end';
    else if (sentence.isParagraphStart && (shift || kind === 'heading')) scene = 'start';

    return {
      index: sentence.index,
      paragraphIndex: sentence.paragraphIndex ?? 0,
      text: sentence.text,
      words: sentence.words,
      kind,
      emotion,
      intensity: round(clamp(intensity, 0, 1), 2),
      importance: round(importance, 2),
      emphasis: round(clamp(emphasis, 0, 1), 2),
      emphasisWords,
      rateFactor: round(clamp(rateFactor, 0.7, 1.35), 3),
      pitchFactor: round(clamp(pitchFactor, -0.35, 0.35), 3),
      extraPauseMs: Math.round(clamp(extraPauseMs, 0, 1500)),
      extraPauseBeforeMs: Math.round(clamp(extraPauseBeforeMs, 0, 1500)),
      topicShift: Boolean(shift),
      scene,
      note: notes.join(' '),
    };
  });

  // --- Escenas (bloques narrativos) ----------------------------------------
  const scenes = paragraphs.map((paragraph, index) => {
    const inside = analysed.filter((item) => item.paragraphIndex === paragraph.index);
    const emotions = inside.map((item) => item.emotion).filter((emotion) => emotion !== 'neutral');
    return {
      index,
      title: paragraph.text.slice(0, 70),
      words: paragraph.words,
      sentences: inside.length,
      dominantEmotion: emotions[0] || 'neutral',
      importance: inside.length
        ? round(inside.reduce((sum, item) => sum + item.importance, 0) / inside.length, 2)
        : 0,
    };
  });

  const highlights = [...analysed]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)
    .map((item) => ({ index: item.index, text: item.text.slice(0, 120), reason: item.note }));

  const emotionTally = new Map();
  for (const item of analysed) {
    emotionTally.set(item.emotion, (emotionTally.get(item.emotion) || 0) + item.words);
  }
  const tone = [...emotionTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  return {
    provider: 'heuristic',
    language,
    tone,
    summary:
      `${analysed.length} frase(s) en ${paragraphs.length} bloque(s). ` +
      `Tono dominante: ${tone}. ` +
      `${analysed.filter((item) => item.topicShift).length} giro(s) narrativo(s) detectado(s).`,
    sentences: analysed,
    scenes,
    highlights,
    markers: parsed.markers.length,
    warnings: parsed.unknown.length
      ? [`Marcadores no reconocidos que se leeran tal cual: ${parsed.unknown.map((item) => item.raw).join(', ')}`]
      : [],
  };
}

/* ==========================================================================
 *  OPTIMIZADOR DE GUIONES (requisito 7)
 * ======================================================================== */

/** Une de nuevo las frases respetando saltos de linea y parrafos originales. */
function rebuild(blocks) {
  return blocks
    .map((block) => block.lines.map((line) => line.join(' ')).join('\n'))
    .join('\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Divide una frase demasiado larga por un conector natural.
 * El conector no se pierde: se convierte en el arranque de la frase nueva,
 * de modo que el sentido del texto original se mantiene intacto.
 */
const SPLIT_CONNECTORS = [
  { marker: ', y por eso ', lead: 'Por eso, ' },
  { marker: ', pero ', lead: 'Pero ' },
  { marker: ', aunque ', lead: 'Aunque ' },
  { marker: ', porque ', lead: 'Porque ' },
  { marker: ', mientras ', lead: 'Mientras ' },
  { marker: ', sin embargo, ', lead: 'Sin embargo, ' },
  { marker: ', y ', lead: '' },
];

function splitLongSentence(text) {
  if (countWords(text) <= 28) return null;
  for (const { marker, lead } of SPLIT_CONNECTORS) {
    const position = text.indexOf(marker, Math.floor(text.length * 0.3));
    if (position > 0 && position < text.length - 20) {
      const first = `${text.slice(0, position).trim()}.`;
      const rest = text.slice(position + marker.length).trim();
      const second = lead
        ? `${lead}${rest}`
        : rest.charAt(0).toUpperCase() + rest.slice(1);
      return [first, second];
    }
  }
  return null;
}

/** Detecta palabras de contenido repetidas en una ventana corta. */
function findRepetitions(text) {
  const list = tokenize(text);
  const positions = new Map();
  const repeated = [];
  list.forEach((word, index) => {
    if (word.length < 5 || STOPWORDS.has(word)) return;
    const previous = positions.get(word);
    if (previous !== undefined && index - previous <= 25) {
      repeated.push(word);
    }
    positions.set(word, index);
  });
  return [...new Set(repeated)].slice(0, 6);
}

/**
 * Genera una version optimizada del guion.
 * NUNCA sustituye el original: devuelve ambos textos y la lista de cambios
 * para que el usuario decida (requisito 7).
 */
export function optimizeHeuristic(rawScript = '', options = {}) {
  const original = String(rawScript);
  const language = options.language || detectLanguage(original);
  const changes = [];
  const notes = [];

  let text = original;

  // --- 1. Puntuacion y espaciado ------------------------------------------
  const before1 = text;
  text = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/([,;:])(?=[^\s\d])/g, '$1 ')
    .replace(/([.!?])(?=[\p{Lu}¿¡])/gu, '$1 ')
    .replace(/\.{4,}/g, '...')
    .replace(/([!?]){3,}/g, '$1$1');
  if (text !== before1) {
    changes.push({
      type: 'puntuacion',
      title: 'Puntuacion y espaciado',
      detail: 'Se corrigieron espacios sobrantes y signos mal separados. Evita cortes raros al leer.',
    });
  }

  // --- 2. Signos de apertura en castellano --------------------------------
  if (language === 'es') {
    const before2 = text;
    text = text.replace(/(^|[\n.!?]\s*)([^\n.!?]*?\?)/g, (match, prefix, body) => {
      if (body.trim().startsWith('¿')) return match;
      return `${prefix}¿${body.trimStart()}`;
    });
    text = text.replace(/(^|[\n.!?]\s*)([^\n.!?]*?!)/g, (match, prefix, body) => {
      if (body.trim().startsWith('¡')) return match;
      return `${prefix}¡${body.trimStart()}`;
    });
    if (text !== before2) {
      changes.push({
        type: 'puntuacion',
        title: 'Signos de apertura',
        detail: 'Se anadieron los signos de apertura de interrogacion y exclamacion, que el motor de voz usa para entonar.',
      });
    }
  }

  // --- 3. Abreviaturas y simbolos que el TTS lee mal ----------------------
  const expanded = [];
  for (const rule of TTS_EXPANSIONS) {
    if (rule.pattern.test(text)) {
      rule.pattern.lastIndex = 0;
      text = text.replace(rule.pattern, rule.replacement);
      expanded.push(rule.label);
    }
    rule.pattern.lastIndex = 0;
  }
  if (expanded.length) {
    changes.push({
      type: 'pronunciacion',
      title: 'Pronunciacion de abreviaturas',
      detail: `Se escribieron completas para que suenen bien: ${expanded.join(', ')}.`,
    });
  }

  // --- 4. Frases largas, pausas y enfasis ---------------------------------
  const { sentences, paragraphs } = segment(text);
  const analysis = analyzeHeuristic(text, { language });
  const hintByIndex = new Map(analysis.sentences.map((item) => [item.index, item]));

  let splitCount = 0;
  let pauseCount = 0;
  let emphasisCount = 0;
  const wordBudget = Math.max(1, Math.round(countWords(text) / 60));

  const blocks = paragraphs.map((paragraph) => ({ lines: [[]], paragraph }));

  paragraphs.forEach((paragraph, blockIndex) => {
    const block = blocks[blockIndex];
    paragraph.sentenceIndexes.forEach((sentenceIndex) => {
      const sentence = sentences[sentenceIndex];
      const hint = hintByIndex.get(sentenceIndex) || {};
      let pieces = [sentence.text];

      const split = splitLongSentence(sentence.text);
      if (split) {
        pieces = split;
        splitCount += 1;
      }

      // Pausa antes de un giro narrativo importante (con moderacion).
      const alreadyHasMarker = /\[[^\]]+\]/.test(sentence.text);
      if (
        !alreadyHasMarker &&
        hint.topicShift &&
        hint.importance >= 0.6 &&
        pauseCount < wordBudget &&
        sentenceIndex > 0
      ) {
        pieces[0] = `[PAUSA] ${pieces[0]}`;
        pauseCount += 1;
      }

      // Enfasis en la frase mas potente de cada bloque (maximo tres).
      if (
        !alreadyHasMarker &&
        emphasisCount < 3 &&
        hint.importance >= 0.75 &&
        sentence.words <= 18 &&
        pieces.length === 1
      ) {
        pieces[0] = `[ENFASIS]${pieces[0]}[/ENFASIS]`;
        emphasisCount += 1;
      }

      const currentLine = block.lines[block.lines.length - 1];
      currentLine.push(...pieces);
      // Se respetan los saltos de linea simples que escribio el usuario.
      if (sentence.terminator === '\n' || sentence.lineBreakAfter) block.lines.push([]);
    });
  });

  text = rebuild(blocks.map((block) => ({ lines: block.lines.filter((line) => line.length) })));

  if (splitCount) {
    changes.push({
      type: 'frase-larga',
      title: `${splitCount} frase(s) larga(s) divididas`,
      detail: 'Las frases de mas de 28 palabras se partieron por un conector. Se narran mejor y se entienden mas.',
    });
  }
  if (pauseCount) {
    changes.push({
      type: 'pausa',
      title: `${pauseCount} pausa(s) anadida(s)`,
      detail: 'Se inserto [PAUSA] justo antes de los giros del relato para dar peso a lo que viene.',
    });
  }
  if (emphasisCount) {
    changes.push({
      type: 'enfasis',
      title: `${emphasisCount} frase(s) con enfasis`,
      detail: 'Se marcaron con [ENFASIS] las frases mas importantes del guion.',
    });
  }

  // --- 5. Observaciones que NO modifican el texto -------------------------
  const repetitions = findRepetitions(original);
  if (repetitions.length) {
    notes.push({
      type: 'repeticion',
      title: 'Repeticiones detectadas',
      detail: `Estas palabras se repiten muy seguidas: ${repetitions.join(', ')}. Cambiar alguna por un sinonimo dara mas variedad.`,
    });
  }

  const firstSentence = analysis.sentences[0];
  if (firstSentence && (firstSentence.words > 22 || firstSentence.importance < 0.55)) {
    notes.push({
      type: 'introduccion',
      title: 'La entrada puede ser mas potente',
      detail: 'La primera frase es larga o poco concreta. Prueba a empezar con una pregunta, un dato o una imagen fuerte de 8 a 14 palabras.',
    });
  }

  const longOnes = analysis.sentences.filter((item) => item.words > 24).length;
  if (longOnes > 2) {
    notes.push({
      type: 'ritmo',
      title: 'Ritmo irregular',
      detail: `Quedan ${longOnes} frases largas. Alternar frases cortas y largas da un ritmo mas agradable al escuchar.`,
    });
  }

  const strongest = analysis.highlights.slice(0, 3).map((item) => item.text);
  if (strongest.length) {
    notes.push({
      type: 'enfasis',
      title: 'Frases con mas fuerza',
      detail: `Son las que mas destacan al escuchar: "${strongest.join('" / "')}".`,
    });
  }

  const optimized = text.trim();

  return {
    provider: 'heuristic',
    language,
    original,
    optimized,
    changed: optimized !== original.trim(),
    changes,
    notes,
    stats: {
      originalWords: countWords(original),
      optimizedWords: countWords(optimized),
      originalSentences: analysis.sentences.length,
      optimizedSentences: segment(optimized).sentences.length,
    },
  };
}
