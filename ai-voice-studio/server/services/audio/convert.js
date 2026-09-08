/**
 * Conversion de formatos de audio (requisito 9).
 *
 * Orden de preferencia:
 *   1. Pedir el formato directamente al proveedor TTS (sin conversion).
 *   2. Si hay ffmpeg instalado, convertir con ffmpeg (la mejor calidad).
 *   3. Si no lo hay, convertir WAV -> MP3 con un codificador en JavaScript
 *      puro (lamejs), de modo que la descarga en MP3 funcione siempre.
 *
 * MP3 -> WAV requiere ffmpeg: si no esta disponible se avisa al usuario con
 * un mensaje claro en lugar de fallar en silencio.
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { logger } from '../../logger.js';
import { decodeWav } from './wav.js';

// Tablas del estandar MPEG Audio Layer III (kbps y Hz).
const MP3_BITRATES = {
  mpeg1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  mpeg2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const MP3_SAMPLE_RATES = {
  3: [44100, 48000, 32000, 0], // MPEG-1
  2: [22050, 24000, 16000, 0], // MPEG-2
  0: [11025, 12000, 8000, 0], // MPEG-2.5
};

let ffmpegChecked = false;
let ffmpegBinary = null;

/**
 * Comprueba que el binario sirva para lo que necesita la aplicacion.
 * Existen compilaciones reducidas de ffmpeg (por ejemplo la que acompana a
 * algunas herramientas de automatizacion) que responden a `-version` pero no
 * saben leer MP3 ni escribir WAV. Sin esta comprobacion la aplicacion
 * anunciaria la descarga en WAV y luego fallaria.
 */
function supportsAudioFormats(binary) {
  try {
    const muxers = spawnSync(binary, ['-hide_banner', '-muxers'], { encoding: 'utf8', timeout: 5000 });
    const decoders = spawnSync(binary, ['-hide_banner', '-decoders'], { encoding: 'utf8', timeout: 5000 });
    const canWriteWav = /\bwav\b/.test(muxers.stdout || '');
    const canReadMp3 = /\bmp3\b/.test(decoders.stdout || '');
    return canWriteWav && canReadMp3;
  } catch {
    return false;
  }
}

/** Detecta ffmpeg una sola vez por proceso. */
export function findFfmpeg() {
  if (ffmpegChecked) return ffmpegBinary;
  ffmpegChecked = true;

  const candidates = [config.audio.ffmpegPath, 'ffmpeg'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const probe = spawnSync(candidate, ['-version'], { stdio: 'ignore', timeout: 5000 });
      if (probe.status !== 0) continue;

      if (!supportsAudioFormats(candidate)) {
        logger.warn(
          `Se encontro ffmpeg en "${candidate}", pero esa compilacion no admite MP3 ni WAV. ` +
            'Se ignorara y se usara el codificador MP3 en JavaScript.',
        );
        continue;
      }

      ffmpegBinary = candidate;
      logger.info(`ffmpeg detectado: ${candidate}`);
      return ffmpegBinary;
    } catch {
      // Se prueba el siguiente candidato.
    }
  }

  logger.info(
    'ffmpeg no esta disponible: la descarga en MP3 seguira funcionando (codificador en JavaScript) ' +
      'y la de WAV requerira generar de nuevo la narracion en ese formato.',
  );
  return null;
}

/** Identifica el formato real por sus bytes de cabecera. */
export function sniffFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 'unknown';
  if (buffer.toString('ascii', 0, 4) === 'RIFF') return 'wav';
  if (buffer.toString('ascii', 0, 3) === 'ID3') return 'mp3';
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'mp3';
  if (buffer.toString('ascii', 0, 4) === 'OggS') return 'ogg';
  if (buffer.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  return 'unknown';
}

/**
 * Duracion de un MP3 recorriendo sus cuadros.
 * Contar cuadros funciona igual con tasa constante (CBR) y variable (VBR),
 * y evita el error de estimar a partir de un unico encabezado.
 */
export function mp3Duration(buffer) {
  let offset = 0;
  if (buffer.length > 10 && buffer.toString('ascii', 0, 3) === 'ID3') {
    // El tamano de la etiqueta ID3v2 viene codificado en siete bits por byte.
    offset = 10 + ((buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9]);
  }

  let seconds = 0;
  let frames = 0;
  let i = offset;

  while (i < buffer.length - 4) {
    if (buffer[i] !== 0xff || (buffer[i + 1] & 0xe0) !== 0xe0) {
      i += 1;
      continue;
    }

    const versionBits = (buffer[i + 1] & 0x18) >> 3; // 3=MPEG-1, 2=MPEG-2, 0=MPEG-2.5
    const layerBits = (buffer[i + 1] & 0x06) >> 1; // 1 = Layer III
    const rates = MP3_SAMPLE_RATES[versionBits];
    if (layerBits !== 1 || !rates) {
      i += 1;
      continue;
    }

    const table = versionBits === 3 ? MP3_BITRATES.mpeg1 : MP3_BITRATES.mpeg2;
    const bitrate = table[(buffer[i + 2] & 0xf0) >> 4];
    const sampleRate = rates[(buffer[i + 2] & 0x0c) >> 2];
    if (!bitrate || !sampleRate) {
      i += 1;
      continue;
    }

    const padding = (buffer[i + 2] & 0x02) >> 1;
    const coefficient = versionBits === 3 ? 144 : 72;
    const frameLength = Math.floor((coefficient * bitrate * 1000) / sampleRate) + padding;
    if (frameLength < 24) {
      i += 1;
      continue;
    }

    seconds += (versionBits === 3 ? 1152 : 576) / sampleRate;
    frames += 1;
    i += frameLength;
  }

  return frames ? Math.round(seconds * 10) / 10 : 0;
}

/** Duracion real del audio segun su formato. */
export function audioDuration(buffer, format) {
  try {
    if (format === 'wav') {
      const { sampleRate, channels, samples } = decodeWav(buffer);
      return Math.round((samples.length / (sampleRate * channels)) * 10) / 10;
    }
    if (format === 'mp3') return mp3Duration(buffer);
  } catch {
    return 0;
  }
  return 0;
}

/** Ejecuta ffmpeg con archivos temporales (mas fiable que las tuberias). */
async function runFfmpeg(buffer, inputExt, outputExt, args) {
  const binary = findFfmpeg();
  if (!binary) return null;

  const id = crypto.randomUUID();
  const dir = os.tmpdir();
  const input = path.join(dir, `avs-${id}-in.${inputExt}`);
  const output = path.join(dir, `avs-${id}-out.${outputExt}`);

  try {
    await fs.writeFile(input, buffer);
    await new Promise((resolve, reject) => {
      const child = spawn(binary, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, ...args, output], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg termino con codigo ${code}: ${stderr.slice(0, 300)}`));
      });
    });
    return await fs.readFile(output);
  } catch (error) {
    logger.warn('La conversion con ffmpeg fallo', { message: error.message });
    return null;
  } finally {
    await fs.rm(input, { force: true }).catch(() => {});
    await fs.rm(output, { force: true }).catch(() => {});
  }
}

/** Codifica un WAV a MP3 en JavaScript puro (sin dependencias del sistema). */
async function wavToMp3WithLame(buffer, { bitrate = 128 } = {}) {
  const module = await import('@breezystack/lamejs');
  const lame = module.default ?? module;
  const { sampleRate, channels, samples } = decodeWav(buffer);

  const encoder = new lame.Mp3Encoder(channels, sampleRate, bitrate);
  const chunks = [];
  const blockSize = 1152 * channels;

  if (channels === 2) {
    const frames = Math.floor(samples.length / 2);
    const left = new Int16Array(frames);
    const right = new Int16Array(frames);
    for (let i = 0; i < frames; i += 1) {
      left[i] = samples[i * 2];
      right[i] = samples[i * 2 + 1];
    }
    for (let i = 0; i < frames; i += 1152) {
      const end = Math.min(i + 1152, frames);
      const encoded = encoder.encodeBuffer(left.subarray(i, end), right.subarray(i, end));
      if (encoded.length) chunks.push(Buffer.from(encoded));
    }
  } else {
    for (let i = 0; i < samples.length; i += blockSize) {
      const encoded = encoder.encodeBuffer(samples.subarray(i, Math.min(i + blockSize, samples.length)));
      if (encoded.length) chunks.push(Buffer.from(encoded));
    }
  }

  const tail = encoder.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

/**
 * Garantiza que el audio este en el formato solicitado.
 *
 * @param {Buffer} buffer
 * @param {'mp3'|'wav'} from
 * @param {'mp3'|'wav'} to
 * @returns {Promise<{buffer: Buffer, format: string, converted: boolean, method: string}>}
 */
export async function ensureFormat(buffer, from, to) {
  const source = from === 'unknown' ? sniffFormat(buffer) : from;
  if (source === to) return { buffer, format: to, converted: false, method: 'nativo' };

  if (source === 'wav' && to === 'mp3') {
    const viaFfmpeg = await runFfmpeg(buffer, 'wav', 'mp3', ['-codec:a', 'libmp3lame', '-b:a', '128k']);
    if (viaFfmpeg) return { buffer: viaFfmpeg, format: 'mp3', converted: true, method: 'ffmpeg' };
    const viaLame = await wavToMp3WithLame(buffer);
    return { buffer: viaLame, format: 'mp3', converted: true, method: 'lamejs' };
  }

  if (to === 'wav') {
    const viaFfmpeg = await runFfmpeg(buffer, source === 'unknown' ? 'bin' : source, 'wav', [
      '-codec:a',
      'pcm_s16le',
    ]);
    if (viaFfmpeg) return { buffer: viaFfmpeg, format: 'wav', converted: true, method: 'ffmpeg' };
    throw errors.conversionUnavailable('wav');
  }

  // Cualquier otra combinacion (ogg, mp4...) necesita ffmpeg.
  const viaFfmpeg = await runFfmpeg(buffer, source === 'unknown' ? 'bin' : source, to, []);
  if (viaFfmpeg) return { buffer: viaFfmpeg, format: to, converted: true, method: 'ffmpeg' };
  throw errors.conversionUnavailable(to);
}

/** Formatos que la instalacion actual puede entregar. */
export function availableFormats() {
  const hasFfmpeg = Boolean(findFfmpeg());
  return {
    mp3: true, // Siempre: nativo del proveedor o codificado con lamejs.
    wav: hasFfmpeg, // Nativo del proveedor, o desde MP3 solo con ffmpeg.
    ffmpeg: hasFfmpeg,
  };
}
