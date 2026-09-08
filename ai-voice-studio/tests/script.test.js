/**
 * Pruebas del motor de guion: marcadores, segmentacion, estadisticas,
 * analisis heuristico, optimizador y plan de interpretacion.
 *
 *   npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMarkers } from '../server/services/script/markers.js';
import { segment, splitSentences } from '../server/services/script/segmenter.js';
import { computeStats, shortsReport } from '../server/services/script/stats.js';
import { buildPerformance, normalizeControls } from '../server/services/script/director.js';
import { toGoogleSsml, toAzureSsml, toBreakText } from '../server/services/script/ssml.js';
import { sanitizeScript, slugify } from '../server/services/script/text.js';
import { analyzeHeuristic, optimizeHeuristic } from '../server/services/ai/heuristic.provider.js';

/* ===================== MARCADORES (requisito 6) ===================== */

test('los marcadores reconocidos no se pronuncian', () => {
  const { cleanText } = parseMarkers('Hola. [PAUSA] Adios. [EMOCION: FELIZ] Fin.');
  assert.equal(cleanText, 'Hola. Adios. Fin.');
});

test('cada marcador de pausa produce su silencio en milisegundos', () => {
  const { tokens } = parseMarkers('A. [PAUSA] B. [PAUSA LARGA] C. [PAUSA: 1.5s] D. [PAUSA CORTA] E.');
  const pauses = tokens.filter((token) => token.type === 'pause').map((token) => token.ms);
  assert.deepEqual(pauses, [500, 900, 1500, 250]);
});

test('acepta variantes con tilde, en ingles y en minusculas', () => {
  const conTilde = parseMarkers('Uno. [ÉNFASIS: importante] Dos.');
  assert.equal(conTilde.cleanText, 'Uno. importante Dos.');
  assert.equal(parseMarkers('One. [pause] Two.').cleanText, 'One. Two.');
  assert.equal(parseMarkers('Uno. [emocion: feliz] Dos.').markers[0].value, 'joy');
});

test('el enfasis por bloque marca solo el texto que envuelve', () => {
  const { tokens } = parseMarkers('Normal [ENFASIS]muy fuerte[/ENFASIS] normal.');
  const enfatizados = tokens.filter((token) => token.type === 'text' && token.emphasis).map((t) => t.value);
  assert.deepEqual(enfatizados, ['muy fuerte']);
});

test('los corchetes desconocidos se respetan y se avisan', () => {
  const { cleanText, unknown } = parseMarkers('Texto. [Nota del autor] Mas texto.');
  assert.match(cleanText, /\[Nota del autor\]/);
  assert.equal(unknown.length, 1);
});

/* ===================== SEGMENTACION ===================== */

test('no corta en abreviaturas ni en decimales', () => {
  const frases = splitSentences('El Dr. Perez tardo 3.5 horas. Despues descanso.');
  assert.equal(frases.length, 2);
  assert.equal(frases[0].text, 'El Dr. Perez tardo 3.5 horas.');
});

test('reconoce parrafos y saltos de linea simples', () => {
  const { paragraphs, sentences } = segment('Uno. Dos.\nTres.\n\nCuatro.');
  assert.equal(paragraphs.length, 2);
  assert.equal(sentences.length, 4);
  assert.equal(sentences[1].lineBreakAfter, true);
  assert.equal(sentences[0].lineBreakAfter, false);
});

/* ===================== ESTADISTICAS (requisito 12) ===================== */

test('las estadisticas cuentan palabras, frases y parrafos', () => {
  const stats = computeStats('Primera frase corta. Segunda frase.\n\nOtro parrafo aqui.');
  assert.equal(stats.words, 8);
  assert.equal(stats.sentences, 3);
  assert.equal(stats.paragraphs, 2);
  assert.ok(stats.estimatedSeconds > 0);
  assert.match(stats.estimatedDuration, /s$/);
});

test('bajar la velocidad alarga la duracion estimada', () => {
  const texto = 'Una frase de prueba con unas cuantas palabras para medir el tiempo.';
  const rapido = computeStats(texto, { speed: 1.5 });
  const lento = computeStats(texto, { speed: 0.7 });
  assert.ok(lento.estimatedSeconds > rapido.estimatedSeconds);
});

test('el informe de Shorts devuelve duracion, palabras y sugerencias', () => {
  const informe = shortsReport('Sabias que el 90 por ciento falla? Te cuento por que.', { targetSeconds: 30 });
  assert.ok(informe.words > 0);
  assert.match(informe.estimatedDuration, /s$/);
  assert.ok(informe.suggestions.some((s) => s.id === 'hook'));
  assert.ok(informe.suggestions.some((s) => s.id === 'duracion'));
});

/* ===================== ANALISIS (requisito 5) ===================== */

test('detecta preguntas, exclamaciones y titulos', () => {
  const { sentences } = analyzeHeuristic('TITULO DEL BLOQUE\nEsto es una afirmacion. Que pasa aqui? Increible!');
  const tipos = sentences.map((s) => s.kind);
  assert.ok(tipos.includes('heading'));
  assert.ok(tipos.includes('question'));
  assert.ok(tipos.includes('exclamation'));
});

test('"Pero entonces ocurrio algo inesperado" se marca como giro con pausa previa', () => {
  const { sentences } = analyzeHeuristic(
    'Todo iba bien aquella manana. Pero entonces ocurrio algo inesperado. Nada volvio a ser igual.',
  );
  const giro = sentences[1];
  assert.equal(giro.topicShift, true);
  assert.ok(giro.extraPauseBeforeMs >= 200, 'deberia reservar una pausa antes del giro');
  assert.ok(giro.emphasis > sentences[0].emphasis, 'deberia sonar con mas peso que la frase anterior');
});

test('reconoce el cambio emocional del texto', () => {
  const { sentences } = analyzeHeuristic(
    'Fue un dia de celebracion, alegria y exito para todos.\nDespues llego el dolor, la perdida y la tristeza.',
  );
  assert.equal(sentences[0].emotion, 'joy');
  assert.equal(sentences[1].emotion, 'sadness');
});

test('detecta el idioma del guion', () => {
  assert.equal(analyzeHeuristic('Esta es una frase en castellano con varias palabras.').language, 'es');
  assert.equal(analyzeHeuristic('This is a sentence in English with several words.').language, 'en');
});

/* ===================== OPTIMIZADOR (requisito 7) ===================== */

test('el optimizador devuelve las dos versiones sin tocar el original', () => {
  const original = 'Hola.Que tal ? El 50% respondio.';
  const resultado = optimizeHeuristic(original);
  assert.equal(resultado.original, original);
  assert.notEqual(resultado.optimized, original);
  assert.ok(resultado.changes.length > 0);
});

test('el optimizador conserva parrafos y saltos de linea', () => {
  const original = 'Primera linea.\nSegunda linea.\n\nOtro parrafo.';
  const { optimized } = optimizeHeuristic(original);
  assert.equal(optimized.split('\n\n').length, 2);
  assert.equal(optimized.split('\n').length, 4);
});

test('el optimizador no recorta ni infla el guion', () => {
  const original = Array.from({ length: 12 }, (_, i) => `Esta es la frase numero ${i} del guion.`).join(' ');
  const resultado = optimizeHeuristic(original);
  const proporcion = resultado.stats.optimizedWords / resultado.stats.originalWords;
  assert.ok(proporcion > 0.85 && proporcion < 1.3, `proporcion inesperada: ${proporcion}`);
});

/* ===================== PLAN DE INTERPRETACION ===================== */

test('el plan aplica estilo, controles y marcadores', () => {
  const guion = 'Bienvenidos. [PAUSA LARGA] Pero entonces ocurrio algo inesperado.';
  const plan = buildPerformance({
    script: guion,
    analysis: analyzeHeuristic(guion),
    styleId: 'documental',
    controls: { speed: 0.9, intensity: 0.8 },
    autoInterpret: true,
  });

  assert.equal(plan.segments.length, 2);
  assert.ok(plan.segments[0].rate < 1, 'el estilo documental y la velocidad 0.9 deben ralentizar');
  assert.ok(plan.segments[0].pauseAfterMs >= 900, 'debe incluir la pausa larga escrita por el usuario');
  assert.ok(plan.segments[1].reasons.includes('cambio-de-tema'));
  assert.ok(plan.estimatedSeconds > 0);
});

test('sin interpretacion automatica los marcadores siguen mandando', () => {
  const guion = 'Uno. [PAUSA LARGA] Dos.';
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion), autoInterpret: false });
  assert.ok(plan.segments[0].pauseAfterMs >= 900);
  assert.equal(plan.segments[1].emotion, 'neutral');
});

test('el plan nunca modifica el texto del usuario', () => {
  const guion = 'Frase con acentos: cancion, corazon y mas. Otra frase.';
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion) });
  assert.equal(plan.segments.map((s) => s.text).join(' '), guion);
});

test('los controles se recortan a su rango valido', () => {
  const controles = normalizeControls({ speed: 99, pitch: -50, volume: 'x', intensity: 0.5 });
  assert.equal(controles.speed, 2);
  assert.equal(controles.pitch, -1);
  assert.equal(controles.volume, 1);
  assert.equal(controles.intensity, 0.5);
});

/* ===================== SSML ===================== */

test('el SSML de Google incluye prosodia y pausas', () => {
  const guion = 'Una frase. [PAUSA LARGA] Otra frase.';
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion) });
  const ssml = toGoogleSsml(plan);
  assert.match(ssml, /^<speak>/);
  assert.match(ssml, /<prosody rate="\d+%"/);
  assert.match(ssml, /<break time="\d+ms"\/>/);
  assert.ok(!ssml.includes('[PAUSA'), 'los marcadores no deben llegar al motor de voz');
});

test('el SSML de Azure declara la voz y escapa los caracteres reservados', () => {
  const guion = 'Precio < 10 & envio "gratis".';
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion) });
  const ssml = toAzureSsml(plan, { voiceName: 'es-ES-ElviraNeural', language: 'es-ES' });
  assert.match(ssml, /<voice name="es-ES-ElviraNeural">/);
  assert.match(ssml, /&lt;/);
  assert.match(ssml, /&amp;/);
  assert.match(ssml, /&quot;gratis&quot;/);
});

test('el texto para ElevenLabs mantiene las palabras y anade silencios', () => {
  const guion = 'Primera frase. [PAUSA LARGA] Segunda frase.';
  const plan = buildPerformance({ script: guion, analysis: analyzeHeuristic(guion) });
  const texto = toBreakText(plan);
  assert.match(texto, /Primera frase\./);
  assert.match(texto, /Segunda frase\./);
  assert.match(texto, /<break time="[\d.]+s" \/>/);
});

/* ===================== SANEADO (requisito 17) ===================== */

test('el saneado elimina caracteres invisibles y conserva los parrafos', () => {
  const zeroWidth = String.fromCharCode(0x200b);
  const sucio = `Hola ${zeroWidth}mundo\r\n\r\nSegundo parrafo`;
  assert.equal(sanitizeScript(sucio), 'Hola mundo\n\nSegundo parrafo');
});

test('el saneado no interpreta HTML: se queda como texto', () => {
  assert.equal(sanitizeScript('<script>alert(1)</script> Hola'), '<script>alert(1)</script> Hola');
});

test('el nombre de archivo se genera desde el nombre del proyecto', () => {
  assert.equal(slugify('Documental: Historia de Colombia'), 'documental_historia_de_colombia');
  assert.equal(slugify('   '), 'narracion');
});
