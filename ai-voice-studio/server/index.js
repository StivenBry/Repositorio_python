/**
 * AI Voice Studio - servidor.
 *
 * Arquitectura (requisito 14):
 *
 *   public/         Frontend (HTML, CSS y JavaScript sin compilar)
 *   server/routes   API HTTP
 *   server/services/script   Motor de guion (marcadores, estadisticas, plan)
 *   server/services/ai       Motor de IA        (abstraccion + proveedores)
 *   server/services/tts      Motor de voz       (abstraccion + proveedores)
 *   server/services/storage  Almacenamiento     (abstraccion + drivers)
 *   server/services/audio    Utilidades de audio (WAV, MP3, conversion)
 *
 * Las claves de API viven unicamente aqui, en variables de entorno.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

import { config, publicConfig, startupWarnings, ROOT_DIR } from './config.js';
import { logger } from './logger.js';
import { apiRouter } from './routes/index.js';
import { securityHeaders, cors } from './middleware/security.js';
import { rateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initStorage, getStorage } from './services/storage/index.js';
import { findFfmpeg } from './services/audio/convert.js';

export function createApp() {
  const app = express();

  // Necesario para que el limitador vea la IP real detras de un proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(cors);
  app.use(express.json({ limit: config.limits.jsonBodyLimit }));
  app.use('/api', rateLimit());
  app.use('/api', apiRouter);

  // Frontend estatico.
  app.use(
    express.static(path.join(ROOT_DIR, 'public'), {
      index: 'index.html',
      maxAge: config.isProduction ? '1h' : 0,
      etag: true,
    }),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

/** Arranque del servidor con limpieza periodica de audios caducados. */
export async function start() {
  await initStorage();
  findFfmpeg();

  const app = createApp();
  const server = app.listen(config.port, () => {
    const info = publicConfig();
    const url = `http://localhost:${config.port}`;

    // La aplicacion no abre el navegador sola: se indica la direccion de forma
    // bien visible para que baste con pulsarla o copiarla.
    process.stdout.write(
      `\n  AI Voice Studio esta funcionando.\n` +
        `  Abre esta direccion en tu navegador:  ${url}\n` +
        `  (para detenerlo, pulsa Ctrl + C en esta ventana)\n\n`,
    );

    logger.info(`Escuchando en ${url}`);
    logger.info(`Motor de voz: ${info.ttsProvider}${info.ttsConfigured ? '' : ' (sin credenciales)'}`);
    logger.info(`Motor de IA:  ${info.aiProvider}${info.aiConfigured ? '' : ' (sin credenciales)'}`);
    for (const warning of startupWarnings()) logger.warn(warning);
  });

  // Limpieza de audios antiguos: al arrancar y cada seis horas.
  const cleanup = () => {
    getStorage()
      .cleanup()
      .catch((error) => logger.warn('No se pudo limpiar el almacenamiento', { message: error.message }));
  };
  cleanup();
  const timer = setInterval(cleanup, 6 * 3600 * 1000);
  timer.unref?.();

  const shutdown = (signal) => {
    logger.info(`Recibida la senal ${signal}: cerrando el servidor.`);
    clearInterval(timer);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

/**
 * Indica si este archivo se esta ejecutando directamente (`node server/index.js`)
 * o si lo esta importando otro modulo, como las pruebas.
 *
 * La comparacion DEBE hacerse convirtiendo la ruta a URL con `pathToFileURL`.
 * Concatenar "file://" con la ruta funciona en Linux y macOS, pero no en
 * Windows: alli `process.argv[1]` es "C:\...\index.js" mientras que
 * `import.meta.url` es "file:///C:/.../index.js", nunca coinciden y el
 * servidor se cerraba en silencio nada mas arrancar.
 */
function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    // realpath resuelve enlaces simbolicos (por ejemplo /tmp en macOS),
    // que es como Node normaliza la URL del modulo.
    return import.meta.url === pathToFileURL(fs.realpathSync(entry)).href;
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  }
}

if (isMainModule()) {
  start().catch((error) => {
    logger.error('No se pudo arrancar el servidor', { message: error.message });
    process.exit(1);
  });
}
