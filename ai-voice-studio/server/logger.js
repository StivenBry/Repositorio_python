/**
 * Logger minimo con niveles y saneado de credenciales.
 * En produccion emite JSON por linea (facil de ingerir); en desarrollo,
 * texto legible con color.
 */

import { config } from './config.js';
import { redact } from './errors.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? (config.isProduction ? LEVELS.info : LEVELS.debug);

const COLORS = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
const RESET = '\x1b[0m';

function emit(level, message, meta) {
  if (LEVELS[level] < threshold) return;
  const safeMessage = redact(message);
  if (config.isProduction) {
    const line = { ts: new Date().toISOString(), level, message: safeMessage };
    if (meta && Object.keys(meta).length) line.meta = JSON.parse(redact(JSON.stringify(meta)));
    process.stdout.write(`${JSON.stringify(line)}\n`);
    return;
  }
  const time = new Date().toLocaleTimeString('es');
  const extra = meta && Object.keys(meta).length ? ` ${redact(JSON.stringify(meta))}` : '';
  process.stdout.write(`${COLORS[level]}${time} ${level.toUpperCase().padEnd(5)}${RESET} ${safeMessage}${extra}\n`);
}

export const logger = {
  debug: (message, meta) => emit('debug', message, meta),
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
};
