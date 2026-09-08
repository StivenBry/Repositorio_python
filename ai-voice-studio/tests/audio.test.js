/**
 * Pruebas del motor de audio: WAV, conversion a MP3 y sintetizador offline.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { encodeWav, decodeWav, wavDuration, concatWav } from '../server/services/audio/wav.js';
import { ensureFormat, sniffFormat, audioDuration, availableFormats } from '../server/services/audio/convert.js';
import { chunkPlan } from '../server/services/tts/chunk.js';
import { MockTtsProvider } from '../server/services/tts/mock.provider.js';
import { buildPerformance } from '../server/services/script/director.js';
import { analyzeHeuristic } from '../server/services/ai/heuristic.provider.js';
import { getStyle } from '../server/services/script/styles.js';

/** Genera un tono de prueba de la duracion indicada. */
function tone(seconds, sampleRate = 22050) {
  const samples = new Float32Array(Math.round(seconds * sampleRate));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.4;
  }
  return encodeWav(samples, { sampleRate });
}

test('el WAV generado se puede volver a leer', () => {
  const wav = tone(1.5);
  const decoded = decodeWav(wav);
  assert.equal(decoded.sampleRate, 22050);
  assert.equal(decoded.channels, 1);
  assert.equal(Math.round(wavDuration(wav) * 10) / 10, 1.5);
});

test('reconoce el formato por los bytes de cabecera', () => {
  assert.equal(sniffFormat(tone(0.2)), 'wav');
  assert.equal(sniffFormat(Buffer.from([0xff, 0xfb, 0x90, 0x00])), 'mp3');
  assert.equal(sniffFormat(Buffer.from('ID3xxxx')), 'mp3');
  assert.equal(sniffFormat(Buffer.from([1, 2, 3])), 'unknown');
});

test('unir varios WAV suma sus duraciones', () => {
  const unido = concatWav([tone(1), tone(0.5), tone(0.5)]);
  assert.equal(Math.round(wavDuration(unido) * 10) / 10, 2);
});

test('la conversion a MP3 funciona aunque no haya ffmpeg', async () => {
  const wav = tone(2);
  const resultado = await ensureFormat(wav, 'wav', 'mp3');
  assert.equal(resultado.format, 'mp3');
  assert.equal(sniffFormat(resultado.buffer), 'mp3');
  assert.ok(resultado.buffer.length > 1000);
  // El codificador anade un cuadro de relleno: se admite una decima de margen.
  assert.ok(Math.abs(audioDuration(resultado.buffer, 'mp3') - 2) <= 0.3);
});

test('pedir el formato que ya se tiene no convierte nada', async () => {
  const wav = tone(0.5);
  const resultado = await ensureFormat(wav, 'wav', 'wav');
  assert.equal(resultado.converted, false);
  assert.equal(resultado.buffer, wav);
});

test('el troceado del plan respeta las frases completas', () => {
  const guion = Array.from({ length: 30 }, (_, i) => `Esta es la frase numero ${i} del guion de prueba.`).join(' ');
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion) });
  const trozos = chunkPlan(plan, 600);

  assert.ok(trozos.length > 1, 'un guion largo deberia partirse');
  const total = trozos.reduce((suma, trozo) => suma + trozo.segments.length, 0);
  assert.equal(total, plan.segments.length, 'no se puede perder ninguna frase');
  assert.equal(trozos[1].leadingSilenceMs, 0, 'solo el primer trozo lleva el silencio inicial');
});

test('el motor offline genera audio con la duracion prevista', async () => {
  const guion = 'Primera frase de la prueba. [PAUSA LARGA] Segunda frase de la prueba.';
  const plan = buildPerformance({
    script: guion,
    analysis: analyzeHeuristic(guion),
    styleId: 'natural',
  });

  const resultado = await new MockTtsProvider().synthesize(plan, {
    voiceId: 'demo-mateo',
    format: 'wav',
    style: getStyle('natural'),
  });

  assert.equal(resultado.format, 'wav');
  assert.equal(sniffFormat(resultado.buffer), 'wav');
  assert.ok(resultado.durationSeconds > 0);
  const desvio = Math.abs(resultado.durationSeconds - plan.estimatedSeconds) / plan.estimatedSeconds;
  assert.ok(desvio < 0.2, `la duracion real (${resultado.durationSeconds}s) se aleja de la estimada (${plan.estimatedSeconds}s)`);
  assert.ok(resultado.notes.length > 0, 'debe advertir de que no es una voz humana');
});

test('el motor offline tambien entrega MP3', async () => {
  const guion = 'Una frase corta para la prueba.';
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion) });
  const resultado = await new MockTtsProvider().synthesize(plan, {
    voiceId: 'demo-sofia',
    format: 'mp3',
    style: getStyle('natural'),
  });
  assert.equal(resultado.format, 'mp3');
  assert.equal(sniffFormat(resultado.buffer), 'mp3');
});

test('el catalogo de voces de demostracion esta completo', async () => {
  const voces = await new MockTtsProvider().listVoices();
  assert.ok(voces.length >= 5);
  for (const voz of voces) {
    assert.ok(voz.id && voz.name && voz.language);
    assert.ok(['male', 'female', 'neutral'].includes(voz.gender));
    assert.match(voz.languageLabel, /\w/);
  }
  assert.ok(voces.some((v) => v.gender === 'male'));
  assert.ok(voces.some((v) => v.gender === 'female'));
});

test('la aplicacion siempre puede entregar MP3', () => {
  assert.equal(availableFormats().mp3, true);
});
