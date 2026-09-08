/**
 * Limitador de peticiones por IP (requisito 17).
 *
 * Implementacion en memoria con ventana deslizante simple. Suficiente para un
 * despliegue de un solo proceso; detras de varios servidores conviene usar
 * un almacen compartido (Redis) o el limitador del proxy.
 */

import { config } from '../config.js';
import { errors } from '../errors.js';

const buckets = new Map();

/** Limpieza periodica para que el mapa no crezca sin control. */
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > config.limits.rateWindowMs * 4) buckets.delete(key);
  }
}, 60_000);
sweeper.unref?.();

/**
 * @param {object} [options]
 * @param {number} [options.max]    Peticiones permitidas por ventana.
 * @param {string} [options.scope]  Nombre del cupo (permite cupos separados).
 */
export function rateLimit({ max = config.limits.rateMaxRequests, scope = 'global' } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    const key = `${scope}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > config.limits.rateWindowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((config.limits.rateWindowMs - (now - bucket.start)) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      next(errors.rateLimited(retryAfter));
      return;
    }

    next();
  };
}

/** Solo para las pruebas: vacia los contadores. */
export function resetRateLimits() {
  buckets.clear();
}
