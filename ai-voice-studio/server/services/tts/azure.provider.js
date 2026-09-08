/**
 * Proveedor de voz: Microsoft Azure Speech (DE PAGO, con capa gratuita F0).
 *
 * Configuracion en .env:
 *   TTS_PROVIDER=azure
 *   AZURE_SPEECH_KEY=...
 *   AZURE_SPEECH_REGION=westeurope   (la region de tu recurso)
 *
 * Que soporta: SSML completo, velocidad, tono, volumen, pausas y ademas
 * estilos expresivos por voz (`mstts:express-as`), que se aprovechan para
 * traducir las emociones detectadas en el guion.
 */

import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { request, requestJson } from '../http.js';
import { audioDuration } from '../audio/convert.js';
import { toAzureSsml } from '../script/ssml.js';
import { TtsProvider, languageLabel, normalizeGender } from './base.provider.js';

const LABEL = 'servicio de voz';

function credentials() {
  const { apiKey, region } = config.tts.azure;
  if (!apiKey || !region) throw errors.providerNotConfigured('tts');
  return { apiKey, region };
}

const OUTPUT_FORMATS = {
  mp3: 'audio-24khz-96kbitrate-mono-mp3',
  wav: 'riff-24khz-16bit-mono-pcm',
};

/** Cache del catalogo: la lista de voces de Azure es larga y cambia poco. */
let voicesCache = { at: 0, region: '', data: null };
const VOICES_TTL_MS = 30 * 60 * 1000;

export class AzureTtsProvider extends TtsProvider {
  constructor() {
    super('azure', {
      ssml: true,
      perSentenceProsody: true,
      rate: true,
      pitch: true,
      volume: true,
      breaks: true,
      styles: true,
      formats: ['mp3', 'wav'],
      needsKey: true,
    });
  }

  async listVoices() {
    const { apiKey, region } = credentials();
    const fresh = voicesCache.data && voicesCache.region === region && Date.now() - voicesCache.at < VOICES_TTL_MS;
    if (fresh) return voicesCache.data;

    const data = await requestJson(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      { headers: { 'Ocp-Apim-Subscription-Key': apiKey } },
      { label: LABEL, timeoutMs: 25_000 },
    );

    const preferred = String(config.tts.language || 'es-ES').split('-')[0];
    const voices = (Array.isArray(data) ? data : [])
      .filter((voice) => String(voice.Locale || '').toLowerCase().startsWith(preferred))
      .map((voice) => {
        const styles = Array.isArray(voice.StyleList) ? voice.StyleList : [];
        return {
          id: voice.ShortName,
          name: voice.LocalName || voice.DisplayName || voice.ShortName,
          gender: normalizeGender(voice.Gender),
          language: voice.Locale,
          languageLabel: languageLabel(voice.Locale),
          accent: voice.LocaleName || languageLabel(voice.Locale),
          description: styles.length
            ? `Voz neuronal con ${styles.length} estilo(s) expresivo(s): ${styles.slice(0, 4).join(', ')}.`
            : 'Voz neuronal natural y estable.',
          tags: [voice.VoiceType === 'Neural' ? 'neuronal' : 'estandar', ...styles.slice(0, 3)],
          styles,
          provider: 'azure',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    voicesCache = { at: Date.now(), region, data: voices };
    return voices;
  }

  async synthesize(plan, { voiceId, format = 'mp3', style } = {}) {
    if (!voiceId) throw errors.validation('Elige una voz antes de generar la narracion.');
    const { apiKey, region } = credentials();

    const language = String(voiceId).split('-').slice(0, 2).join('-') || 'es-ES';
    const resolved = format === 'wav' ? 'wav' : 'mp3';
    const ssml = toAzureSsml(plan, { voiceName: voiceId, language, styleName: style?.azureStyle || null });

    const response = await request(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': OUTPUT_FORMATS[resolved],
          'User-Agent': 'ai-voice-studio',
        },
        body: ssml,
      },
      { label: LABEL, timeoutMs: 180_000, retries: 1 },
    );

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      buffer,
      format: resolved,
      sampleRate: 24000,
      durationSeconds: audioDuration(buffer, resolved),
      notes: [],
    };
  }
}
