/**
 * Proveedor de voz: OpenAI Text-to-Speech (API DE PAGO).
 *
 * Configuracion en .env:
 *   TTS_PROVIDER=openai
 *   OPENAI_API_KEY=sk-...
 *   OPENAI_TTS_MODEL=gpt-4o-mini-tts   (opcional)
 *
 * Que soporta: voces multilingues, velocidad global y, sobre todo, el campo
 * `instructions`, que acepta indicaciones de interpretacion en lenguaje
 * natural. Aqui se traduce el plan a esas indicaciones. NO admite SSML, asi
 * que las pausas se transmiten mediante la puntuacion del propio guion.
 */

import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { request } from '../http.js';
import { averageRate, toInstructions } from '../script/ssml.js';
import { clamp } from '../script/text.js';
import { TtsProvider } from './base.provider.js';

const ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const LABEL = 'servicio de voz';

/**
 * Catalogo de voces. OpenAI no publica un endpoint de listado, asi que se
 * mantiene aqui. El genero corresponde a la percepcion habitual: OpenAI no
 * lo declara oficialmente y se indica asi en la descripcion.
 */
const VOICES = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral', description: 'Equilibrada y neutra. Buena opcion por defecto.', tags: ['neutra', 'versatil'] },
  { id: 'ash', name: 'Ash', gender: 'male', description: 'Grave y firme, con presencia.', tags: ['grave', 'firme'] },
  { id: 'ballad', name: 'Ballad', gender: 'male', description: 'Suave y expresiva, con matices.', tags: ['suave', 'expresiva'] },
  { id: 'coral', name: 'Coral', gender: 'female', description: 'Calida y cercana. Encaja en formacion.', tags: ['calida', 'cercana'] },
  { id: 'echo', name: 'Echo', gender: 'male', description: 'Serena y clara, tono informativo.', tags: ['serena', 'clara'] },
  { id: 'fable', name: 'Fable', gender: 'neutral', description: 'Narrativa, con aire britanico.', tags: ['narrativa', 'britanica'] },
  { id: 'nova', name: 'Nova', gender: 'female', description: 'Luminosa y agil. Ideal para redes sociales.', tags: ['luminosa', 'agil'] },
  { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Muy grave y profunda. Documental y trailer.', tags: ['muy grave', 'profunda'] },
  { id: 'sage', name: 'Sage', gender: 'female', description: 'Tranquila y madura, tono divulgativo.', tags: ['tranquila', 'madura'] },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Brillante y amable.', tags: ['brillante', 'amable'] },
  { id: 'verse', name: 'Verse', gender: 'male', description: 'Versatil y natural, buena para dialogo.', tags: ['versatil', 'natural'] },
];

export class OpenAiTtsProvider extends TtsProvider {
  constructor() {
    super('openai', {
      ssml: false,
      perSentenceProsody: false,
      rate: true,
      pitch: false,
      volume: false,
      breaks: false,
      styles: true,
      formats: ['mp3', 'wav'],
      needsKey: true,
    });
  }

  async listVoices() {
    return VOICES.map((voice) => ({
      ...voice,
      language: 'multi',
      languageLabel: 'Multilingue (incluye castellano)',
      accent: 'Neutro',
      description: `${voice.description} El genero es orientativo: OpenAI no lo declara oficialmente.`,
      tags: [...voice.tags, 'multilingue'],
      provider: 'openai',
    }));
  }

  async synthesize(plan, { voiceId, format = 'mp3', style } = {}) {
    const apiKey = config.tts.openai.apiKey;
    if (!apiKey) throw errors.providerNotConfigured('tts');

    const voice = VOICES.find((item) => item.id === voiceId)?.id || 'alloy';
    const responseFormat = format === 'wav' ? 'wav' : 'mp3';

    const response = await request(
      ENDPOINT,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: config.tts.openai.model,
          voice,
          input: plan.text,
          response_format: responseFormat,
          // El rango admitido es 0.25-4.0; el plan trabaja entre 0.5 y 2.
          speed: clamp(averageRate(plan), 0.25, 4),
          instructions: toInstructions(plan, style),
        }),
      },
      { label: LABEL, timeoutMs: 180_000, retries: 1 },
    );

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      buffer,
      format: responseFormat,
      sampleRate: 24000,
      durationSeconds: 0,
      notes: [
        'Esta voz interpreta el estilo mediante indicaciones en lenguaje natural; las pausas dependen de la puntuacion del guion.',
      ],
    };
  }
}

export { VOICES as OPENAI_VOICES };
