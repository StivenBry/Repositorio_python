/**
 * Prompts y validacion compartidos por los proveedores de IA externos.
 *
 * Estrategia: la IA NUNCA es la unica fuente de verdad. Siempre se parte del
 * analisis heuristico local y la respuesta del modelo se fusiona encima campo
 * a campo, validando rangos. Asi, si el modelo devuelve datos incompletos o
 * mal formados, la aplicacion sigue funcionando con una calidad razonable.
 */

import { clamp, countWords, round } from '../script/text.js';
import { VALID_EMOTIONS, VALID_KINDS } from './base.provider.js';
import { getStyle } from '../script/styles.js';

const EMOTION_SET = new Set(VALID_EMOTIONS);
const KIND_SET = new Set(VALID_KINDS);

/** Instrucciones de sistema para el analisis de interpretacion. */
export function analysisSystemPrompt() {
  return [
    'Eres un director de doblaje y locucion con veinte anos de experiencia.',
    'Recibes las frases numeradas de un guion y decides como debe interpretarse cada una.',
    'NUNCA cambias, traduces ni reescribes el texto: solo lo anotas.',
    'Respondes exclusivamente con un objeto JSON valido, sin texto adicional ni bloques de codigo.',
  ].join(' ');
}

/** Mensaje de usuario con las frases y el esquema de respuesta esperado. */
export function analysisUserPrompt(sentences, { styleId = 'natural', language = 'es' } = {}) {
  const style = getStyle(styleId);
  const numbered = sentences
    .map((sentence) => `${sentence.index}: ${sentence.text}`)
    .join('\n');

  return [
    `Estilo de narracion solicitado: ${style.label} (${style.description})`,
    `Idioma detectado: ${language}`,
    '',
    'FRASES:',
    numbered,
    '',
    'Devuelve un JSON con esta forma exacta:',
    '{',
    '  "language": "es",',
    '  "tone": "una palabra",',
    '  "summary": "dos frases como maximo",',
    '  "sentences": [{',
    '    "index": 0,',
    `    "kind": "uno de: ${VALID_KINDS.join(' | ')}",`,
    `    "emotion": "uno de: ${VALID_EMOTIONS.join(' | ')}",`,
    '    "intensity": 0.0,',
    '    "importance": 0.0,',
    '    "emphasis": 0.0,',
    '    "emphasisWords": ["palabras literales de la frase"],',
    '    "rateFactor": 1.0,',
    '    "pitchFactor": 0.0,',
    '    "extraPauseMs": 0,',
    '    "extraPauseBeforeMs": 0,',
    '    "topicShift": false,',
    '    "scene": null,',
    '    "note": "una frase breve en castellano explicando la decision"',
    '  }]',
    '}',
    '',
    'Reglas:',
    '- "rateFactor" entre 0.7 y 1.35 (1 = velocidad normal).',
    '- "pitchFactor" entre -0.35 y 0.35 (0 = tono normal).',
    '- "extraPauseMs" y "extraPauseBeforeMs" entre 0 y 1500 milisegundos.',
    '- "scene" puede ser "start", "end" o null.',
    '- Incluye una entrada por cada frase, con su mismo indice.',
    '- Marca "topicShift": true cuando la frase abre un giro (por ejemplo "Pero entonces...").',
    '- Una frase clave merece pausa antes, mas enfasis y algo menos de velocidad.',
  ].join('\n');
}

/** Instrucciones de sistema para el optimizador de guiones. */
export function optimizeSystemPrompt() {
  return [
    'Eres un guionista especializado en textos escritos para ser LEIDOS EN VOZ ALTA.',
    'Mejoras el guion sin inventar datos nuevos, sin anadir informacion que no este en el original',
    'y sin cambiar el idioma, el sentido ni el orden de las ideas.',
    'Respondes exclusivamente con un objeto JSON valido, sin texto adicional ni bloques de codigo.',
  ].join(' ');
}

/** Mensaje de usuario del optimizador. */
export function optimizeUserPrompt(script, { styleId = 'natural', language = 'es', goals = [] } = {}) {
  const style = getStyle(styleId);
  const requested = goals.length
    ? goals.join(', ')
    : 'naturalidad, puntuacion, pausas, introduccion, facilidad de lectura, repeticiones, ritmo, enfasis';

  return [
    `Estilo objetivo: ${style.label}. Idioma: ${language}.`,
    `Aspectos a mejorar: ${requested}.`,
    '',
    'GUION ORIGINAL:',
    '"""',
    script,
    '"""',
    '',
    'Puedes usar estos marcadores en el guion optimizado (no se pronuncian):',
    '[PAUSA] [PAUSA CORTA] [PAUSA LARGA] [ENFASIS]...[/ENFASIS] [EMOCION: FELIZ] [TONO: MISTERIOSO] [VELOCIDAD: LENTA]',
    '',
    'Devuelve un JSON con esta forma exacta:',
    '{',
    '  "optimized": "guion completo ya mejorado, conservando los saltos de linea",',
    '  "changes": [{"type": "puntuacion|pausa|enfasis|frase-larga|ritmo|introduccion|pronunciacion",',
    '               "title": "titulo corto", "detail": "que se cambio y por que"}],',
    '  "notes": [{"type": "sugerencia", "title": "titulo corto", "detail": "consejo que no se aplico automaticamente"}]',
    '}',
    '',
    'Reglas:',
    '- Conserva TODA la informacion del original. No resumas ni amplies el contenido.',
    '- La longitud final debe parecerse a la original (entre el 70 % y el 130 % de las palabras).',
    '- Usa los marcadores con moderacion: uno cada dos o tres frases como maximo.',
    '- Escribe "changes" y "notes" en castellano claro, para una persona sin conocimientos tecnicos.',
  ].join('\n');
}

/**
 * Extrae el primer objeto JSON de una respuesta de modelo, tolerando
 * bloques de codigo o texto alrededor.
 */
export function parseJsonResponse(raw = '') {
  const text = String(raw).trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate);
  } catch {
    // Ultimo intento: recortar desde la primera llave hasta la ultima.
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const num = (value, min, max, fallback) =>
  Number.isFinite(Number(value)) ? round(clamp(Number(value), min, max), 3) : fallback;

/**
 * Fusiona la respuesta del modelo sobre el analisis heuristico.
 * Cada campo se valida por separado: lo que no sea valido se descarta y se
 * conserva el valor local.
 */
export function mergeAnalysis(baseline, data, providerId) {
  if (!data || typeof data !== 'object') return baseline;

  const byIndex = new Map();
  if (Array.isArray(data.sentences)) {
    for (const item of data.sentences) {
      if (Number.isInteger(item?.index)) byIndex.set(item.index, item);
    }
  }

  const sentences = baseline.sentences.map((base) => {
    const patch = byIndex.get(base.index);
    if (!patch) return base;

    const emphasisWords = Array.isArray(patch.emphasisWords)
      ? patch.emphasisWords
          .filter((word) => typeof word === 'string' && word.trim())
          .map((word) => word.trim().slice(0, 40))
          .slice(0, 6)
      : base.emphasisWords;

    return {
      ...base,
      kind: KIND_SET.has(patch.kind) ? patch.kind : base.kind,
      emotion: EMOTION_SET.has(patch.emotion) ? patch.emotion : base.emotion,
      intensity: num(patch.intensity, 0, 1, base.intensity),
      importance: num(patch.importance, 0, 1, base.importance),
      emphasis: num(patch.emphasis, 0, 1, base.emphasis),
      emphasisWords,
      rateFactor: num(patch.rateFactor, 0.7, 1.35, base.rateFactor),
      pitchFactor: num(patch.pitchFactor, -0.35, 0.35, base.pitchFactor),
      extraPauseMs: Math.round(num(patch.extraPauseMs, 0, 1500, base.extraPauseMs)),
      extraPauseBeforeMs: Math.round(num(patch.extraPauseBeforeMs, 0, 1500, base.extraPauseBeforeMs)),
      topicShift: typeof patch.topicShift === 'boolean' ? patch.topicShift : base.topicShift,
      scene: ['start', 'end'].includes(patch.scene) ? patch.scene : base.scene,
      note: typeof patch.note === 'string' && patch.note.trim() ? patch.note.trim().slice(0, 220) : base.note,
    };
  });

  const highlights = [...sentences]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)
    .map((item) => ({ index: item.index, text: item.text.slice(0, 120), reason: item.note }));

  return {
    ...baseline,
    provider: providerId,
    language: typeof data.language === 'string' ? data.language.slice(0, 8) : baseline.language,
    tone: typeof data.tone === 'string' ? data.tone.slice(0, 40) : baseline.tone,
    summary: typeof data.summary === 'string' && data.summary.trim()
      ? data.summary.trim().slice(0, 400)
      : baseline.summary,
    sentences,
    highlights,
  };
}

const cleanList = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === 'object' && typeof item.title === 'string')
        .slice(0, 12)
        .map((item) => ({
          type: typeof item.type === 'string' ? item.type.slice(0, 24) : 'sugerencia',
          title: String(item.title).slice(0, 90),
          detail: typeof item.detail === 'string' ? item.detail.slice(0, 400) : '',
        }))
    : [];

/**
 * Valida la propuesta del optimizador. Si el modelo devuelve algo vacio,
 * desproporcionado o irreconocible, se conserva la version heuristica.
 */
export function mergeOptimization(original, data, fallback, providerId) {
  const optimized = typeof data?.optimized === 'string' ? data.optimized.trim() : '';
  if (!optimized) return fallback;

  const originalWords = countWords(original);
  const optimizedWords = countWords(optimized);
  const ratio = originalWords ? optimizedWords / originalWords : 1;

  // Un guion que encoge a la mitad o se duplica ya no es "el mismo guion".
  if (originalWords >= 20 && (ratio < 0.55 || ratio > 1.9)) {
    return {
      ...fallback,
      notes: [
        ...fallback.notes,
        {
          type: 'aviso',
          title: 'Propuesta descartada',
          detail:
            'La version generada cambiaba demasiado la longitud del guion, asi que se muestra la optimizacion basica y segura.',
        },
      ],
    };
  }

  const changes = cleanList(data.changes);
  return {
    provider: providerId,
    language: fallback.language,
    original,
    optimized,
    changed: optimized !== original.trim(),
    changes: changes.length ? changes : fallback.changes,
    notes: [...cleanList(data.notes), ...fallback.notes].slice(0, 10),
    stats: {
      originalWords,
      optimizedWords,
      originalSentences: fallback.stats.originalSentences,
      optimizedSentences: fallback.stats.optimizedSentences,
    },
  };
}
