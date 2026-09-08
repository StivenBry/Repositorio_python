/**
 * Traduce el plan de interpretacion al lenguaje que entiende cada motor.
 *
 * Cada proveedor expone un subconjunto distinto de controles, asi que aqui
 * vive toda la conversion de unidades (multiplicador -> porcentaje, semitonos,
 * decibelios...). Anadir un proveedor nuevo normalmente solo requiere una
 * funcion mas en este archivo.
 */

import { escapeXml, clamp, round } from './text.js';

const signed = (value, decimals = 0) => {
  const number = round(value, decimals);
  return `${number >= 0 ? '+' : ''}${number.toFixed(decimals)}`;
};

/** 1.0 -> "100%"; 0.85 -> "85%" */
export const rateToPercent = (rate) => `${Math.round(clamp(rate, 0.25, 4) * 100)}%`;

/** -1..1 -> semitonos ("+4st"). */
export const pitchToSemitones = (pitch) => `${signed(clamp(pitch, -1, 1) * 8, 1)}st`;

/** -1..1 -> porcentaje relativo ("+25%"). */
export const pitchToPercent = (pitch) => `${signed(clamp(pitch, -1, 1) * 25, 0)}%`;

/** Multiplicador -> decibelios (Google). */
export const volumeToDb = (volume) => {
  const db = 20 * Math.log10(clamp(volume, 0.05, 4));
  return `${signed(clamp(db, -12, 6), 1)}dB`;
};

/** Multiplicador -> etiqueta de volumen soportada por Azure. */
export const volumeToWord = (volume) => {
  if (volume < 0.6) return 'x-soft';
  if (volume < 0.85) return 'soft';
  if (volume <= 1.1) return 'medium';
  if (volume <= 1.35) return 'loud';
  return 'x-loud';
};

/** Multiplicador -> velocidad relativa de Azure ("+8%"). */
export const rateToRelativePercent = (rate) => `${signed((clamp(rate, 0.25, 4) - 1) * 100, 0)}%`;

/** Emocion interna -> estilo expresivo de Azure. */
const AZURE_EMOTION_STYLE = {
  joy: 'cheerful',
  sadness: 'sad',
  anger: 'angry',
  tension: 'fearful',
  awe: 'excited',
  calm: 'calm',
  urgency: 'excited',
  hope: 'hopeful',
  neutral: null,
};

/** Emocion interna -> descripcion en castellano (para la interfaz y OpenAI). */
export const EMOTION_LABELS = {
  neutral: 'neutral',
  joy: 'alegre',
  sadness: 'triste',
  anger: 'enfadada',
  tension: 'tensa',
  awe: 'asombrada',
  calm: 'serena',
  urgency: 'urgente',
  hope: 'esperanzada',
};

function emphasisLevel(value) {
  if (value >= 0.75) return 'strong';
  if (value >= 0.35) return 'moderate';
  return null;
}

/**
 * SSML para Google Cloud Text-to-Speech.
 * Se apoya en <prosody> por frase y <break> entre frases.
 */
export function toGoogleSsml(plan) {
  const parts = ['<speak>'];
  if (plan.leadingSilenceMs > 0) parts.push(`<break time="${plan.leadingSilenceMs}ms"/>`);

  for (const segment of plan.segments) {
    const level = emphasisLevel(segment.emphasis);
    const inner = level
      ? `<emphasis level="${level}">${escapeXml(segment.text)}</emphasis>`
      : escapeXml(segment.text);
    parts.push(
      `<prosody rate="${rateToPercent(segment.rate)}" pitch="${pitchToSemitones(segment.pitch)}" volume="${volumeToDb(segment.volume)}">${inner}</prosody>`,
    );
    if (segment.pauseAfterMs > 0) parts.push(`<break time="${segment.pauseAfterMs}ms"/>`);
  }

  parts.push('</speak>');
  return parts.join('');
}

/**
 * SSML para Microsoft Azure Speech.
 * Anade <mstts:express-as> cuando la voz admite estilos expresivos.
 */
export function toAzureSsml(plan, { voiceName, language = 'es-ES', styleName = null } = {}) {
  const parts = [
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${escapeXml(language)}">`,
    `<voice name="${escapeXml(voiceName)}">`,
  ];

  if (plan.leadingSilenceMs > 0) parts.push(`<break time="${plan.leadingSilenceMs}ms"/>`);

  let openStyle = null;
  const closeStyle = () => {
    if (openStyle) {
      parts.push('</mstts:express-as>');
      openStyle = null;
    }
  };

  for (const segment of plan.segments) {
    const wanted = AZURE_EMOTION_STYLE[segment.emotion] || styleName || null;
    if (wanted !== openStyle) {
      closeStyle();
      if (wanted) {
        const degree = round(clamp(0.8 + segment.intensity * 1.2, 0.01, 2), 2);
        parts.push(`<mstts:express-as style="${escapeXml(wanted)}" styledegree="${degree}">`);
        openStyle = wanted;
      }
    }

    const level = emphasisLevel(segment.emphasis);
    const inner = level
      ? `<emphasis level="${level}">${escapeXml(segment.text)}</emphasis>`
      : escapeXml(segment.text);

    parts.push(
      `<prosody rate="${rateToRelativePercent(segment.rate)}" pitch="${pitchToPercent(segment.pitch)}" volume="${volumeToWord(segment.volume)}">${inner}</prosody>`,
    );
    if (segment.pauseAfterMs > 0) parts.push(`<break time="${segment.pauseAfterMs}ms"/>`);
  }

  closeStyle();
  parts.push('</voice></speak>');
  return parts.join('');
}

/**
 * Texto plano con etiquetas <break> (ElevenLabs).
 * No altera ni una palabra del guion: solo intercala silencios.
 */
export function toBreakText(plan) {
  const parts = [];
  if (plan.leadingSilenceMs > 400) parts.push(`<break time="${round(plan.leadingSilenceMs / 1000, 2)}s" />`);

  plan.segments.forEach((segment, index) => {
    parts.push(segment.text);
    const isLast = index === plan.segments.length - 1;
    // ElevenLabs interpreta mal los silencios muy cortos: por debajo de 250 ms
    // se deja que la propia puntuacion marque el ritmo.
    if (!isLast && segment.pauseAfterMs >= 250) {
      parts.push(` <break time="${round(Math.min(segment.pauseAfterMs, 3000) / 1000, 2)}s" /> `);
    } else if (!isLast) {
      parts.push(' ');
    }
  });

  return parts.join('').trim();
}

/** Velocidad media del plan, ponderada por numero de palabras. */
export function averageRate(plan) {
  const totalWords = plan.segments.reduce((sum, segment) => sum + segment.words, 0);
  if (!totalWords) return 1;
  const weighted = plan.segments.reduce((sum, segment) => sum + segment.rate * segment.words, 0);
  return round(weighted / totalWords, 2);
}

/** Emocion dominante del plan (la que ocupa mas palabras). */
export function dominantEmotion(plan) {
  const tally = new Map();
  for (const segment of plan.segments) {
    tally.set(segment.emotion, (tally.get(segment.emotion) || 0) + segment.words);
  }
  let best = 'neutral';
  let bestWords = -1;
  for (const [emotion, count] of tally) {
    if (count > bestWords) {
      best = emotion;
      bestWords = count;
    }
  }
  return best;
}

/**
 * Instrucciones en lenguaje natural (OpenAI `gpt-4o-mini-tts`).
 * Traduce el plan a una direccion de actuacion breve y concreta.
 */
export function toInstructions(plan, style) {
  const lines = [style.openaiInstructions];
  const emotion = dominantEmotion(plan);
  if (emotion && emotion !== 'neutral') {
    lines.push(`Emocion predominante: ${EMOTION_LABELS[emotion] || emotion}.`);
  }

  const rate = averageRate(plan);
  if (rate <= 0.92) lines.push('Ritmo claramente pausado.');
  else if (rate >= 1.12) lines.push('Ritmo agil, sin atropellar las palabras.');

  if (plan.controls.pitch <= -0.3) lines.push('Registro grave.');
  else if (plan.controls.pitch >= 0.3) lines.push('Registro agudo y luminoso.');

  const emphasized = plan.segments
    .filter((segment) => segment.emphasis >= 0.6)
    .slice(0, 3)
    .map((segment) => segment.text.slice(0, 60));
  if (emphasized.length) {
    lines.push(`Da mas fuerza a estas frases: "${emphasized.join('" / "')}".`);
  }

  const longPauses = plan.segments.filter((segment) => segment.pauseAfterMs >= 700).length;
  if (longPauses > 0) {
    lines.push(`Deja ${longPauses} silencio(s) largo(s) donde el texto lo pida.`);
  }

  lines.push('No leas en voz alta ninguna anotacion entre corchetes.');
  return lines.join(' ');
}

export { AZURE_EMOTION_STYLE };
