/**
 * Manejo central de errores (requisito 16).
 *
 * Ningun error tecnico llega al navegador: se registra completo en el
 * servidor y se responde con un codigo estable y un mensaje en castellano.
 */

import { config } from '../config.js';
import { AppError, toAppError } from '../errors.js';
import { logger } from '../logger.js';

export function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    next(new AppError('NOT_FOUND', 'La operacion solicitada no existe.', { status: 404 }));
    return;
  }
  next();
}

// `next` es obligatorio: Express identifica los manejadores de error por su
// numero de parametros (cuatro), aunque aqui no se use.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const appError = toAppError(error);

  const level = appError.status >= 500 ? 'error' : 'warn';
  logger[level](`${req.method} ${req.path} -> ${appError.code}`, {
    status: appError.status,
    message: appError.message,
    cause: appError.cause?.message,
    stack: config.isProduction ? undefined : appError.cause?.stack?.split('\n').slice(0, 4).join(' | '),
  });

  if (res.headersSent) {
    res.end();
    return;
  }

  res.status(appError.status).json(appError.toJSON());
}

/** Envuelve un manejador asincrono para que sus errores lleguen aqui. */
export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
