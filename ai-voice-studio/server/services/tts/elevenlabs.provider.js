/**
 * Proveedor de voz: ElevenLabs (API DE PAGO, con plan gratuito limitado).
 *
 * Configuracion en .env:
 *   TTS_PROVIDER=elevenlabs
 *   ELEVENLABS_API_KEY=...
 *   ELEVENLABS_MODEL_ID=eleven_multilingual_v2   (opcional)
 *
 * Que soporta: voces muy naturales y multilingues, etiquetas <break> para las
 * pausas y ajustes de estabilidad/estilo. NO admite SSML completo ni control
 * directo de velocidad o tono, asi que el ritmo se transmite a traves de las
 * pausas y de los ajustes de voz.
 */

import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { logger } from '../../logger.js';
import { request, requestJson } from '../http.js';
import { encodeWav } from '../audio/wav.js';
import { ensureFormat } from '../audio/convert.js';
import { toBreakText, averageRate } from '../script/ssml.js';
import { clamp } from '../script/text.js';
import { TtsProvider, languageLabel, normalizeGender } from './base.provider.js';

const BASE_URL = 'https://api.elevenlabs.io/v1';
const PCM_SAMPLE_RATE = 24000;
const LABEL = 'servicio de voz';

function headers() {
  const apiKey = config.tts.elevenlabs.apiKey;
  if (!apiKey) throw errors.providerNotConfigured('tts');
  return { 'xi-api-key': apiKey };
}

/** Convierte los ajustes del plan a los parametros de voz de ElevenLabs. */
function voiceSettings(plan, style) {
  const base = style?.elevenlabs || { stability: 0.5, similarity_boost: 0.75, style: 0.2 };
  const intensity = clamp(plan.controls?.intensity ?? 0.5, 0, 1);
  return {
    // Menos estabilidad = mas variacion expresiva.
    stability: clamp(base.stability - (intensity - 0.5) * 0.25, 0.05, 0.95),
    similarity_boost: clamp(base.similarity_boost, 0.1, 1),
    style: clamp(base.style + (intensity - 0.5) * 0.3, 0, 1),
    use_speaker_boost: true,
  };
}

export class ElevenLabsTtsProvider extends TtsProvider {
  constructor() {
    super('elevenlabs', {
      ssml: false,
      perSentenceProsody: false,
      rate: false,
      pitch: false,
      volume: false,
      breaks: true,
      styles: true,
      formats: ['mp3', 'wav'],
      needsKey: true,
    });
  }

  async listVoices() {
    const data = await requestJson(
      `${BASE_URL}/voices`,
      { headers: headers() },
      { label: LABEL, timeoutMs: 20_000 },
    );

    return (data?.voices || []).map((voice) => {
      const labels = voice.labels || {};
      const language = voice.fine_tuning?.language || labels.language || 'es';
      return {
        id: voice.voice_id,
        name: voice.name || 'Voz',
        gender: normalizeGender(labels.gender),
        language,
        languageLabel: languageLabel(language),
        accent: labels.accent || labels.descriptive || 'Multilingue',
        description: [labels.description, labels.use_case, labels.age]
          .filter(Boolean)
          .join(' | ') || 'Voz de ElevenLabs.',
        tags: Object.values(labels).filter((value) => typeof value === 'string').slice(0, 4),
        preview: voice.preview_url || null,
        provider: 'elevenlabs',
      };
    });
  }

  /** Llama al endpoint de sintesis con el formato de salida indicado. */
  async #speak(voiceId, text, settings, outputFormat) {
    const response = await request(
      `${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: { ...headers(), 'content-type': 'application/json', accept: 'audio/*' },
        body: JSON.stringify({
          text,
          model_id: config.tts.elevenlabs.modelId,
          voice_settings: settings,
        }),
      },
      { label: LABEL, timeoutMs: 180_000, retries: 1 },
    );
    return Buffer.from(await response.arrayBuffer());
  }

  async synthesize(plan, { voiceId, format = 'mp3', style } = {}) {
    if (!voiceId) throw errors.validation('Elige una voz antes de generar la narracion.');

    const text = toBreakText(plan);
    const settings = voiceSettings(plan, style);
    const notes = [];

    const rate = averageRate(plan);
    if (rate < 0.95 || rate > 1.05) {
      notes.push(
        'Esta voz no admite control directo de velocidad: el ritmo se ha ajustado con las pausas del guion.',
      );
    }

    if (format === 'wav') {
      // PCM en crudo -> se envuelve en una cabecera WAV sin necesitar ffmpeg.
      try {
        const pcm = await this.#speak(voiceId, text, settings, `pcm_${PCM_SAMPLE_RATE}`);
        const samples = new Float32Array(Math.floor(pcm.length / 2));
        for (let i = 0; i < samples.length; i += 1) samples[i] = pcm.readInt16LE(i * 2) / 32768;
        const wav = encodeWav(samples, { sampleRate: PCM_SAMPLE_RATE, channels: 1 });
        return {
          buffer: wav,
          format: 'wav',
          sampleRate: PCM_SAMPLE_RATE,
          durationSeconds: Math.round((samples.length / PCM_SAMPLE_RATE) * 10) / 10,
          notes,
        };
      } catch (error) {
        // El formato PCM requiere plan de pago: se recurre a MP3 + conversion.
        logger.warn('ElevenLabs rechazo la salida PCM; se genera MP3 y se convierte.', {
          code: error?.code,
        });
      }
    }

    const mp3 = await this.#speak(voiceId, text, settings, 'mp3_44100_128');
    const result = await ensureFormat(mp3, 'mp3', format === 'wav' ? 'wav' : 'mp3');

    return {
      buffer: result.buffer,
      format: result.format,
      sampleRate: 44100,
      durationSeconds: 0,
      notes,
    };
  }
}
