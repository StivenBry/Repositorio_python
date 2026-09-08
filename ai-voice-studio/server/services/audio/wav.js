/**
 * Lectura y escritura de archivos WAV (PCM 16 bits).
 *
 * Se usa para el motor offline y como formato intermedio antes de convertir
 * a MP3. Es deliberadamente minimo: solo PCM entero, que es lo que devuelven
 * todos los proveedores TTS soportados.
 */

/**
 * Crea un buffer WAV a partir de muestras en coma flotante (-1..1).
 * @param {Float32Array|number[]} samples
 * @param {object} [options]
 * @param {number} [options.sampleRate=22050]
 * @param {number} [options.channels=1]
 * @returns {Buffer}
 */
export function encodeWav(samples, { sampleRate = 22050, channels = 1 } = {}) {
  const frameCount = samples.length;
  const bytesPerSample = 2;
  const dataSize = frameCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // Tamano del bloque fmt.
  buffer.writeUInt16LE(1, 20); // 1 = PCM sin comprimir.
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // Bytes por segundo.
  buffer.writeUInt16LE(channels * bytesPerSample, 32); // Alineacion de bloque.
  buffer.writeUInt16LE(16, 34); // Bits por muestra.
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frameCount; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }

  return buffer;
}

/**
 * Lee un WAV PCM 16 bits y devuelve sus muestras.
 * @param {Buffer} buffer
 * @returns {{sampleRate:number, channels:number, samples:Int16Array}}
 */
export function decodeWav(buffer) {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('El archivo no es un WAV valido.');
  }

  let offset = 12;
  let sampleRate = 22050;
  let channels = 1;
  let bitsPerSample = 16;
  let dataStart = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (id === 'fmt ') {
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataStart = body;
      dataLength = Math.min(size, buffer.length - body);
      break;
    }
    offset = body + size + (size % 2); // Los bloques van alineados a par.
  }

  if (dataStart === -1) throw new Error('El WAV no contiene datos de audio.');
  if (bitsPerSample !== 16) throw new Error(`Solo se admite WAV de 16 bits (recibido: ${bitsPerSample}).`);

  const count = Math.floor(dataLength / 2);
  const samples = new Int16Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = buffer.readInt16LE(dataStart + i * 2);

  return { sampleRate, channels, samples };
}

/** Duracion en segundos de un WAV, sin decodificar todas las muestras. */
export function wavDuration(buffer) {
  try {
    const { sampleRate, channels, samples } = decodeWav(buffer);
    return samples.length / (sampleRate * channels);
  } catch {
    return 0;
  }
}

/**
 * Une varios WAV en uno solo (necesario cuando un proveedor obliga a trocear
 * el guion en varias peticiones). Todos deben compartir frecuencia y canales.
 * @param {Buffer[]} buffers
 * @returns {Buffer}
 */
export function concatWav(buffers) {
  const parts = buffers.filter((buffer) => buffer && buffer.length > 44).map(decodeWav);
  if (!parts.length) throw new Error('No hay audio que unir.');

  const { sampleRate, channels } = parts[0];
  const total = parts.reduce((sum, part) => sum + part.samples.length, 0);
  const merged = new Float32Array(total);

  let offset = 0;
  for (const part of parts) {
    for (let i = 0; i < part.samples.length; i += 1) merged[offset + i] = part.samples[i] / 32768;
    offset += part.samples.length;
  }

  return encodeWav(merged, { sampleRate, channels });
}
