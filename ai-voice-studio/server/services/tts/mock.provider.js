/**
 * Motor de voz OFFLINE de demostracion.
 *
 * Que es: un sintetizador de formantes escrito en JavaScript puro. No usa
 * ninguna API ni ninguna clave, y genera un audio "hablado" que respeta con
 * exactitud el ritmo, las pausas, el tono, el volumen y el enfasis del plan
 * de interpretacion.
 *
 * Que NO es: una voz real. Sirve para probar la aplicacion de principio a fin
 * (generar, escuchar, descargar, guardar el proyecto) y para validar el
 * montaje de un video antes de gastar creditos en un proveedor de pago.
 * Para publicar, configura ElevenLabs, OpenAI, Google o Azure en el .env.
 */

import { clamp } from '../script/text.js';
import { encodeWav } from '../audio/wav.js';
import { ensureFormat } from '../audio/convert.js';
import { TtsProvider, languageLabel } from './base.provider.js';

const SAMPLE_RATE = 22050;
const MAX_SECONDS = 20 * 60; // Tope de seguridad para no agotar la memoria.

/** Catalogo de voces de demostracion, con acentos hispanos e ingleses. */
const VOICES = [
  { id: 'demo-sofia', name: 'Sofia', gender: 'female', language: 'es-ES', accent: 'Castellano', f0: 205, timbre: 1.06, description: 'Calida y clara. Buena para documental y formacion.', tags: ['calida', 'clara'] },
  { id: 'demo-mateo', name: 'Mateo', gender: 'male', language: 'es-CO', accent: 'Bogota', f0: 112, timbre: 0.95, description: 'Grave y serena. Ideal para documental e institucional.', tags: ['grave', 'serena'] },
  { id: 'demo-valentina', name: 'Valentina', gender: 'female', language: 'es-MX', accent: 'Ciudad de Mexico', f0: 220, timbre: 1.1, description: 'Luminosa y agil. Encaja en redes sociales y publicidad.', tags: ['luminosa', 'agil'] },
  { id: 'demo-diego', name: 'Diego', gender: 'male', language: 'es-AR', accent: 'Buenos Aires', f0: 124, timbre: 1, description: 'Cercana y conversacional. Buena para pdcast y tutoriales.', tags: ['cercana', 'natural'] },
  { id: 'demo-lucia', name: 'Lucia', gender: 'female', language: 'es-CO', accent: 'Medellin', f0: 232, timbre: 1.12, description: 'Joven y expresiva. Pensada para Shorts y Reels.', tags: ['joven', 'expresiva'] },
  { id: 'demo-emma', name: 'Emma', gender: 'female', language: 'en-US', accent: 'General American', f0: 198, timbre: 1.05, description: 'Neutra y profesional en ingles.', tags: ['neutra', 'profesional'] },
  { id: 'demo-james', name: 'James', gender: 'male', language: 'en-GB', accent: 'British RP', f0: 106, timbre: 0.93, description: 'Grave y britanica. Buena para documental en ingles.', tags: ['grave', 'britanica'] },
];

/** Formantes aproximados de las vocales del castellano (F1, F2, F3 en Hz). */
const VOWEL_FORMANTS = {
  a: [780, 1300, 2600],
  e: [500, 1900, 2550],
  i: [300, 2250, 3000],
  o: [500, 950, 2500],
  u: [330, 800, 2400],
};

const VOWEL_RE = /[aeiouáéíóúüàèìòùâêîôû]+/gi;

/** Filtro resonante de dos polos: da a la senal el color de una vocal. */
function makeResonator(frequency, bandwidth, sampleRate) {
  const r = Math.exp((-Math.PI * bandwidth) / sampleRate);
  const theta = (2 * Math.PI * frequency) / sampleRate;
  const a1 = -2 * r * Math.cos(theta);
  const a2 = r * r;
  const gain = (1 - r) * Math.sqrt(1 - 2 * r * Math.cos(2 * theta) + r * r);
  let y1 = 0;
  let y2 = 0;
  return (x) => {
    const y = gain * x - a1 * y1 - a2 * y2;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** Divide una palabra en silabas aproximadas y devuelve su vocal nucleo. */
function syllablesOf(word) {
  const matches = [...word.matchAll(VOWEL_RE)];
  if (!matches.length) return [{ vowel: 'a', hasOnset: true }];
  return matches.map((match, index) => ({
    vowel: normalizeVowel(match[0][0]),
    hasOnset: index === 0 ? match.index > 0 : true,
  }));
}

function normalizeVowel(char) {
  const map = { á: 'a', à: 'a', â: 'a', é: 'e', è: 'e', ê: 'e', í: 'i', ì: 'i', î: 'i', ó: 'o', ò: 'o', ô: 'o', ú: 'u', ù: 'u', û: 'u', ü: 'u' };
  const lower = String(char).toLowerCase();
  return VOWEL_FORMANTS[map[lower] || lower] ? map[lower] || lower : 'a';
}

/**
 * Sintetiza un segmento del plan sobre el buffer de salida.
 * @returns {number} indice de escritura despues del segmento
 */
function renderSegment(output, cursor, segment, voice, wpm) {
  const wordTokens = segment.text.match(/[\p{L}\p{N}'-]+/gu) || [];
  if (!wordTokens.length) return cursor;

  const rate = clamp(segment.rate, 0.4, 2.5);
  const targetSeconds = (wordTokens.length / Math.max(60, wpm * rate)) * 60;
  const speechSeconds = targetSeconds * 0.82; // El 18 % restante son microhuecos.

  const syllables = [];
  wordTokens.forEach((word, wordIndex) => {
    const parts = syllablesOf(word);
    parts.forEach((part, partIndex) => {
      syllables.push({
        ...part,
        // La penultima silaba es la tonica en la mayoria de palabras llanas.
        stressed: parts.length > 1 ? partIndex === parts.length - 2 : true,
        lastOfWord: partIndex === parts.length - 1,
        wordIndex,
      });
    });
  });

  const perSyllable = speechSeconds / syllables.length;
  // El hueco entre palabras vale por dos: se reparte el presupuesto de
  // silencio contando esas ranuras dobles para que la duracion real coincida
  // con la que anuncia la interfaz.
  const gapSlots = syllables.length + wordTokens.length;
  const gapSamples = Math.round(((targetSeconds - speechSeconds) / gapSlots) * SAMPLE_RATE);

  const isQuestion = /\?\s*$/.test(segment.text);
  const baseF0 = voice.f0 * 2 ** ((segment.pitch * 8) / 12);
  const amplitude = clamp(segment.volume, 0.1, 1.6) * 0.32;
  const emphasisGain = 1 + segment.emphasis * 0.45;

  syllables.forEach((syllable, index) => {
    const progress = index / Math.max(1, syllables.length - 1);
    // Entonacion: descendente al afirmar, ascendente al preguntar.
    const contour = isQuestion ? 1 + progress * 0.28 : 1 - progress * 0.16;
    const f0 = baseF0 * contour * (syllable.stressed ? 1.06 : 0.98);

    const formants = VOWEL_FORMANTS[syllable.vowel] || VOWEL_FORMANTS.a;
    const resonators = formants.map((frequency, formantIndex) =>
      makeResonator(frequency * voice.timbre, 80 + formantIndex * 50, SAMPLE_RATE),
    );
    const weights = [1, 0.55, 0.28];

    const totalSamples = Math.max(1, Math.round(perSyllable * SAMPLE_RATE));
    const onsetSamples = syllable.hasOnset ? Math.min(Math.round(0.022 * SAMPLE_RATE), totalSamples >> 2) : 0;
    const peak = amplitude * emphasisGain * (syllable.stressed ? 1.15 : 0.9);

    let phase = 0;
    for (let i = 0; i < totalSamples; i += 1) {
      if (cursor >= output.length) return;

      // Envolvente: ataque rapido, cuerpo estable y caida suave.
      const t = i / totalSamples;
      const envelope = t < 0.12 ? t / 0.12 : t > 0.72 ? (1 - t) / 0.28 : 1;

      let source;
      if (i < onsetSamples) {
        // Consonante aproximada: rafaga breve de ruido.
        source = (Math.random() * 2 - 1) * 0.5;
      } else {
        phase += f0 / SAMPLE_RATE;
        if (phase >= 1) phase -= 1;
        // Pulso glotal: diente de sierra suavizado + un poco de aire.
        source = (2 * phase - 1) * 0.8 + (Math.random() * 2 - 1) * 0.06;
      }

      let value = 0;
      for (let f = 0; f < resonators.length; f += 1) value += resonators[f](source) * weights[f];

      output[cursor] = clamp(value * envelope * peak, -1, 1);
      cursor += 1;
    }

    // Microsilencio entre silabas (mayor al terminar una palabra).
    const gap = syllable.lastOfWord ? gapSamples * 2 : gapSamples;
    cursor = Math.min(output.length, cursor + Math.max(0, gap));
  });

  return cursor;
}

export class MockTtsProvider extends TtsProvider {
  constructor() {
    super('mock', {
      ssml: false,
      perSentenceProsody: true,
      rate: true,
      pitch: true,
      volume: true,
      breaks: true,
      styles: true,
      formats: ['wav', 'mp3'],
      needsKey: false,
    });
  }

  async listVoices() {
    return VOICES.map((voice) => ({
      id: voice.id,
      name: voice.name,
      gender: voice.gender,
      language: voice.language,
      languageLabel: languageLabel(voice.language),
      accent: voice.accent,
      description: voice.description,
      tags: [...voice.tags, 'demo'],
      provider: 'mock',
    }));
  }

  /**
   * Genera el audio a partir del plan de interpretacion.
   * @param {object} plan
   * @param {object} options { voiceId, format, style }
   */
  async synthesize(plan, { voiceId, format = 'wav', style } = {}) {
    const voice = VOICES.find((item) => item.id === voiceId) || VOICES[1];
    const wpm = style?.wpm || 150;

    const estimatedSeconds = Math.min(MAX_SECONDS, Math.max(0.5, plan.estimatedSeconds + 1.5));
    const output = new Float32Array(Math.ceil(estimatedSeconds * SAMPLE_RATE));

    let cursor = Math.round((plan.leadingSilenceMs / 1000) * SAMPLE_RATE);

    for (const segment of plan.segments) {
      cursor = renderSegment(output, cursor, segment, voice, wpm);
      cursor = Math.min(output.length, cursor + Math.round((segment.pauseAfterMs / 1000) * SAMPLE_RATE));
      if (cursor >= output.length) break;
    }

    const used = output.subarray(0, Math.max(1, Math.min(cursor + Math.round(0.25 * SAMPLE_RATE), output.length)));
    const wav = encodeWav(used, { sampleRate: SAMPLE_RATE, channels: 1 });
    const result = await ensureFormat(wav, 'wav', format === 'mp3' ? 'mp3' : 'wav');

    return {
      buffer: result.buffer,
      format: result.format,
      sampleRate: SAMPLE_RATE,
      durationSeconds: Math.round((used.length / SAMPLE_RATE) * 10) / 10,
      notes: [
        'Audio generado por el motor de demostracion incluido: reproduce el ritmo, las pausas y el enfasis reales, pero no es una voz humana.',
        'Configura un proveedor de voz en el archivo .env para obtener una narracion natural.',
      ],
    };
  }
}

export { VOICES as MOCK_VOICES };
