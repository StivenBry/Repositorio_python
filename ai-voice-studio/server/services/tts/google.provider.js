/**
 * Proveedor de voz: Google Cloud Text-to-Speech (DE PAGO, con cuota gratuita
 * mensual de caracteres).
 *
 * Configuracion en .env:
 *   TTS_PROVIDER=google
 *   GOOGLE_TTS_API_KEY=...          (clave restringida a la API de TTS)
 *   GOOGLE_TTS_LANGUAGE=es-ES       (idioma por defecto del catalogo)
 *
 * Que soporta: SSML completo, velocidad, tono, volumen y pausas exactas por
 * frase. Es el proveedor que mejor aprovecha el plan de interpretacion.
 * Limitacion: 5000 bytes de SSML por peticion, asi que el guion se trocea
 * automaticamente y el audio se une despues.
 */

import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { requestJson } from '../http.js';
import { concatWav } from '../audio/wav.js';
import { ensureFormat, audioDuration } from '../audio/convert.js';
import { toGoogleSsml } from '../script/ssml.js';
import { chunkPlan } from './chunk.js';
import { TtsProvider, languageLabel, normalizeGender } from './base.provider.js';

const BASE_URL = 'https://texttospeech.googleapis.com/v1';
const LABEL = 'servicio de voz';
const SSML_BUDGET = 3600; // Margen de seguridad frente al limite de 5000 bytes.

function apiKey() {
  const key = config.tts.google.apiKey;
  if (!key) throw errors.providerNotConfigured('tts');
  return key;
}

/** Descripcion legible a partir del nombre tecnico de la voz. */
function describe(name) {
  if (name.includes('Chirp3-HD') || name.includes('Chirp')) {
    return 'Voz de ultima generacion, muy natural y expresiva.';
  }
  if (name.includes('Neural2')) return 'Voz neuronal de alta calidad, natural y estable.';
  if (name.includes('Studio')) return 'Voz de estudio, pensada para locucion profesional.';
  if (name.includes('Wavenet')) return 'Voz WaveNet, natural y con buena entonacion.';
  if (name.includes('Polyglot')) return 'Voz poliglota: mantiene el timbre en varios idiomas.';
  return 'Voz estandar, clara y economica.';
}

function tagsFor(name) {
  const tags = [];
  if (name.includes('Chirp')) tags.push('ultima generacion');
  if (name.includes('Neural2')) tags.push('neuronal');
  if (name.includes('Studio')) tags.push('estudio');
  if (name.includes('Wavenet')) tags.push('wavenet');
  if (name.includes('Standard')) tags.push('economica');
  return tags.length ? tags : ['google'];
}

export class GoogleTtsProvider extends TtsProvider {
  constructor() {
    super('google', {
      ssml: true,
      perSentenceProsody: true,
      rate: true,
      pitch: true,
      volume: true,
      breaks: true,
      styles: false,
      formats: ['mp3', 'wav'],
      needsKey: true,
    });
  }

  async listVoices() {
    const data = await requestJson(
      `${BASE_URL}/voices`,
      { headers: { 'x-goog-api-key': apiKey() } },
      { label: LABEL, timeoutMs: 20_000 },
    );

    const preferred = config.tts.language;
    const preferredBase = preferred.split('-')[0];

    return (data?.voices || [])
      // Se prioriza el idioma configurado; el resto queda disponible igualmente.
      .filter((voice) => (voice.languageCodes || []).some((code) => code.startsWith(preferredBase)))
      .map((voice) => {
        const language = (voice.languageCodes || [])[0] || preferred;
        return {
          id: voice.name,
          name: voice.name.replace(`${language}-`, '').replace(/-/g, ' '),
          gender: normalizeGender(voice.ssmlGender),
          language,
          languageLabel: languageLabel(language),
          accent: languageLabel(language),
          description: describe(voice.name),
          tags: tagsFor(voice.name),
          provider: 'google',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  /** Sintetiza un trozo del plan y devuelve sus bytes. */
  async #speakChunk(chunk, voiceId, encoding) {
    const language = String(voiceId).split('-').slice(0, 2).join('-') || config.tts.google.language;

    const data = await requestJson(
      `${BASE_URL}/text:synthesize`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
        body: JSON.stringify({
          input: { ssml: toGoogleSsml(chunk) },
          voice: { languageCode: language, name: voiceId },
          // El plan ya aplica velocidad, tono y volumen dentro del SSML, asi
          // que aqui se dejan valores neutros para no duplicar el efecto.
          audioConfig: {
            audioEncoding: encoding,
            speakingRate: 1,
            pitch: 0,
            volumeGainDb: 0,
          },
        }),
      },
      { label: LABEL, timeoutMs: 120_000, retries: 1 },
    );

    if (!data?.audioContent) throw errors.generationFailed();
    return Buffer.from(data.audioContent, 'base64');
  }

  async synthesize(plan, { voiceId, format = 'mp3' } = {}) {
    if (!voiceId) throw errors.validation('Elige una voz antes de generar la narracion.');

    const chunks = chunkPlan(plan, SSML_BUDGET);

    // Con un unico trozo se pide el formato final directamente (mejor calidad).
    if (chunks.length === 1) {
      const encoding = format === 'wav' ? 'LINEAR16' : 'MP3';
      const buffer = await this.#speakChunk(chunks[0], voiceId, encoding);
      const resolved = format === 'wav' ? 'wav' : 'mp3';
      return {
        buffer,
        format: resolved,
        sampleRate: format === 'wav' ? 24000 : 24000,
        durationSeconds: audioDuration(buffer, resolved),
        notes: [],
      };
    }

    // Con varios trozos se usa PCM y se unen sin costuras audibles.
    const parts = [];
    for (const chunk of chunks) {
      parts.push(await this.#speakChunk(chunk, voiceId, 'LINEAR16'));
    }
    const merged = concatWav(parts);
    const result = await ensureFormat(merged, 'wav', format === 'wav' ? 'wav' : 'mp3');

    return {
      buffer: result.buffer,
      format: result.format,
      sampleRate: 24000,
      durationSeconds: audioDuration(result.buffer, result.format),
      notes: [`El guion se envio en ${chunks.length} partes por el limite del proveedor y se unio automaticamente.`],
    };
  }
}
