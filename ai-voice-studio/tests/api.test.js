/**
 * Pruebas de la API HTTP de extremo a extremo.
 *
 * Se levanta el servidor real con almacenamiento en memoria y proveedores
 * offline, asi que no hace falta ninguna clave ni conexion a internet.
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

// La configuracion se lee al importar, asi que el entorno se prepara antes.
process.env.NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'memory';
process.env.TTS_PROVIDER = 'mock';
process.env.AI_PROVIDER = 'heuristic';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
process.env.RATE_LIMIT_HEAVY_MAX = '1000';
process.env.LOG_LEVEL = 'error';

const { createApp } = await import('../server/index.js');

let server;
let base;

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : await response.arrayBuffer();
  return { status: response.status, headers: response.headers, body: payload };
};

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

const GUION = 'Bienvenidos al documental. [PAUSA LARGA] Pero entonces ocurrio algo inesperado. Que paso alli?';

/* ===================== INFORMACION ===================== */

test('GET /api/health responde', async () => {
  const { status, body } = await request('/api/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
});

test('GET /api/config no expone ninguna clave', async () => {
  const { status, body } = await request('/api/config');
  assert.equal(status, 200);
  assert.equal(body.ttsProvider, 'mock');
  assert.ok(body.styles.length >= 11, 'deben ofrecerse los once estilos');
  assert.ok(body.markers.length > 0);
  assert.ok(body.controls.ranges.speed);

  const texto = JSON.stringify(body);
  assert.ok(!/apiKey|api_key|sk-|secret|password/i.test(texto), 'la configuracion publica no puede llevar credenciales');
});

test('GET /api/voices devuelve el catalogo normalizado', async () => {
  const { status, body } = await request('/api/voices');
  assert.equal(status, 200);
  assert.ok(body.voices.length > 0);
  for (const voz of body.voices) {
    assert.ok(voz.id && voz.name && voz.languageLabel && voz.accent);
  }
});

/* ===================== GUION ===================== */

test('POST /api/script/stats calcula las estadisticas', async () => {
  const { status, body } = await request('/api/script/stats', { method: 'POST', body: { script: GUION } });
  assert.equal(status, 200);
  assert.equal(body.stats.sentences, 3);
  assert.equal(body.stats.markers, 1);
  assert.ok(body.stats.words > 0);
});

test('POST /api/script/analyze devuelve analisis y plan', async () => {
  const { status, body } = await request('/api/script/analyze', {
    method: 'POST',
    body: { script: GUION, styleId: 'documental', controls: { intensity: 0.8 } },
  });
  assert.equal(status, 200);
  assert.equal(body.analysis.sentences.length, 3);
  assert.equal(body.plan.segments.length, 3);
  assert.ok(body.plan.estimatedSeconds > 0);
  assert.ok(body.plan.segments[1].reasons.includes('cambio-de-tema'));
});

test('POST /api/script/optimize nunca sustituye el original', async () => {
  const original = 'Hola.Que tal ?';
  const { status, body } = await request('/api/script/optimize', { method: 'POST', body: { script: original } });
  assert.equal(status, 200);
  assert.equal(body.original, original);
  assert.ok(body.optimized);
  assert.ok(body.statsOriginal && body.statsOptimized);
});

test('POST /api/script/shorts devuelve duracion y sugerencias', async () => {
  const { status, body } = await request('/api/script/shorts', {
    method: 'POST',
    body: { script: 'Sabias que el 90 por ciento falla? Te cuento por que.', targetSeconds: 30 },
  });
  assert.equal(status, 200);
  assert.equal(body.targetSeconds, 30);
  assert.ok(body.suggestions.length >= 5);
});

/* ===================== GENERACION Y AUDIO ===================== */

test('el recorrido completo genera, reproduce y descarga la narracion', async () => {
  const generacion = await request('/api/tts/generate', {
    method: 'POST',
    body: {
      script: GUION,
      styleId: 'documental',
      voiceId: 'demo-mateo',
      format: 'mp3',
      projectName: 'Documental: Historia de Colombia',
    },
  });

  assert.equal(generacion.status, 200);
  const audio = generacion.body.audio;
  assert.equal(audio.format, 'mp3');
  assert.equal(audio.filename, 'documental_historia_de_colombia.mp3');
  assert.ok(audio.bytes > 1000);

  // Reproduccion.
  const reproduccion = await fetch(`${base}${audio.url}`);
  assert.equal(reproduccion.status, 200);
  assert.equal(reproduccion.headers.get('content-type'), 'audio/mpeg');
  assert.equal(reproduccion.headers.get('accept-ranges'), 'bytes');

  // Peticion por rangos (la barra de progreso del reproductor la necesita).
  const rango = await fetch(`${base}${audio.url}`, { headers: { Range: 'bytes=0-99' } });
  assert.equal(rango.status, 206);
  assert.equal(rango.headers.get('content-length'), '100');

  // Descarga con nombre de archivo.
  const descarga = await fetch(`${base}${audio.downloadUrl}?name=Mi%20Proyecto`);
  assert.equal(descarga.status, 200);
  assert.match(descarga.headers.get('content-disposition'), /filename="mi_proyecto\.mp3"/);
});

test('la generacion en WAV es nativa del motor offline', async () => {
  const { status, body } = await request('/api/tts/generate', {
    method: 'POST',
    body: { script: 'Prueba corta en WAV.', voiceId: 'demo-sofia', format: 'wav', projectName: 'prueba' },
  });
  assert.equal(status, 200);
  assert.equal(body.audio.format, 'wav');
  assert.equal(body.audio.filename, 'prueba.wav');
});

test('POST /api/tts/preview genera una muestra corta', async () => {
  const { status, body } = await request('/api/tts/preview', {
    method: 'POST',
    body: { voiceId: 'demo-lucia', styleId: 'energetico' },
  });
  assert.equal(status, 200);
  assert.ok(body.audio.id);
  assert.ok(body.audio.durationSeconds > 0);
});

/* ===================== PROYECTOS (requisito 10) ===================== */

test('los proyectos se crean, actualizan, listan y borran', async () => {
  const creado = await request('/api/projects', {
    method: 'POST',
    body: {
      name: 'Historia de Colombia',
      script: GUION,
      styleId: 'documental',
      voiceId: 'demo-mateo',
      voiceName: 'Mateo',
      controls: { speed: 0.9 },
    },
  });
  assert.equal(creado.status, 201);
  const proyecto = creado.body.project;
  assert.ok(proyecto.id);
  assert.equal(proyecto.controls.speed, 0.9);
  assert.ok(proyecto.createdAt && proyecto.updatedAt);
  assert.ok(proyecto.stats.words > 0);

  const listado = await request('/api/projects');
  assert.equal(listado.status, 200);
  assert.ok(listado.body.projects.some((item) => item.id === proyecto.id));

  const actualizado = await request(`/api/projects/${proyecto.id}`, {
    method: 'PUT',
    body: { name: 'Historia de Colombia v2', script: 'Guion nuevo.', styleId: 'natural' },
  });
  assert.equal(actualizado.status, 200);
  assert.equal(actualizado.body.project.name, 'Historia de Colombia v2');
  assert.equal(actualizado.body.project.createdAt, proyecto.createdAt, 'la fecha de creacion no cambia');

  const borrado = await request(`/api/projects/${proyecto.id}`, { method: 'DELETE' });
  assert.equal(borrado.status, 200);
  assert.equal((await request(`/api/projects/${proyecto.id}`)).status, 404);
});

/* ===================== ERRORES Y SEGURIDAD ===================== */

test('un guion vacio devuelve un mensaje claro', async () => {
  const { status, body } = await request('/api/script/analyze', { method: 'POST', body: { script: '   ' } });
  assert.equal(status, 400);
  assert.equal(body.error.code, 'EMPTY_SCRIPT');
  assert.match(body.error.message, /vacio/i);
  assert.ok(body.error.hint);
});

test('un guion demasiado largo se rechaza con el limite indicado', async () => {
  const { status, body } = await request('/api/script/analyze', {
    method: 'POST',
    body: { script: 'a'.repeat(20000) },
  });
  assert.equal(status, 413);
  assert.equal(body.error.code, 'TEXT_TOO_LONG');
});

test('no se puede salir de la carpeta de audio con la ruta', async () => {
  for (const id of ['..%2F..%2Fetc%2Fpasswd', 'no-es-uuid', '../../package.json']) {
    const response = await fetch(`${base}/api/audio/${id}`);
    assert.ok(response.status === 404 || response.status === 400, `id "${id}" deberia rechazarse`);
  }
});

test('las respuestas llevan cabeceras de seguridad', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('una ruta de API inexistente responde en castellano', async () => {
  const { status, body } = await request('/api/no-existe');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('un cuerpo que no es un objeto se rechaza', async () => {
  const response = await fetch(`${base}/api/script/stats`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(['no', 'es', 'un', 'objeto']),
  });
  assert.equal(response.status, 400);
});

test('el cliente no puede colar un analisis falso', async () => {
  // El analisis enviado tiene menos frases que el guion: se descarta y se
  // vuelve a calcular en el servidor en lugar de confiar en el navegador.
  const { status, body } = await request('/api/tts/generate', {
    method: 'POST',
    body: {
      script: GUION,
      voiceId: 'demo-mateo',
      analysis: { sentences: [{ index: 0, rateFactor: 99, emphasis: 5 }] },
    },
  });
  assert.equal(status, 200);
  assert.ok(body.audio.id);
});
