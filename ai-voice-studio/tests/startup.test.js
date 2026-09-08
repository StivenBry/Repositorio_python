/**
 * Prueba de arranque real.
 *
 * Lanza `node server/index.js` como proceso independiente, igual que hace
 * `npm start`, y comprueba que se queda escuchando y responde.
 *
 * Existe por un fallo concreto: la comprobacion de "modulo principal" se hacia
 * concatenando "file://" con la ruta del archivo. Eso coincide en Linux y
 * macOS, pero nunca en Windows, donde `process.argv[1]` usa barras invertidas
 * y letra de unidad. El resultado era que en Windows `npm start` terminaba en
 * silencio sin levantar el servidor. Importar la aplicacion desde las pruebas
 * no detectaba el problema: hay que ejecutar el archivo de verdad.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'server', 'index.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('`node server/index.js` levanta el servidor y responde', async () => {
  // Puerto alto y aleatorio para no chocar con otros procesos.
  const port = 39000 + Math.floor(Math.random() * 2000);

  const child = spawn(process.execPath, [ENTRY], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      STORAGE_DRIVER: 'memory',
      TTS_PROVIDER: 'mock',
      AI_PROVIDER: 'heuristic',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let salida = '';
  child.stdout.on('data', (chunk) => {
    salida += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    salida += chunk.toString();
  });

  let salioAntesDeTiempo = null;
  child.on('exit', (code) => {
    salioAntesDeTiempo = code;
  });

  try {
    // Se espera a que responda, hasta 10 segundos.
    let respuesta = null;
    for (let intento = 0; intento < 50; intento += 1) {
      if (salioAntesDeTiempo !== null) break;
      try {
        respuesta = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (respuesta.ok) break;
      } catch {
        // Todavia no escucha: se reintenta.
      }
      await sleep(200);
    }

    assert.equal(
      salioAntesDeTiempo,
      null,
      `el proceso termino con codigo ${salioAntesDeTiempo} en lugar de quedarse escuchando.\nSalida:\n${salida}`,
    );
    assert.ok(respuesta?.ok, `el servidor no respondio en el puerto ${port}.\nSalida:\n${salida}`);
    assert.equal((await respuesta.json()).status, 'ok');

    // El mensaje de arranque debe indicar la direccion que hay que abrir.
    assert.match(salida, new RegExp(`http://localhost:${port}`));
  } finally {
    child.kill('SIGTERM');
    await sleep(300);
    if (salioAntesDeTiempo === null) child.kill('SIGKILL');
  }
});
