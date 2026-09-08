/**
 * Cabeceras de seguridad y CORS (requisito 17).
 *
 * Se escriben a mano en lugar de anadir una dependencia: son pocas y asi
 * queda documentado exactamente que protege cada una.
 */

import { config } from '../config.js';

/**
 * Politica de seguridad de contenido: el navegador solo puede cargar
 * recursos del propio origen. Por eso la interfaz no usa CSS ni JavaScript
 * en linea: todo va en archivos separados.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Nunca se anuncia la tecnologia del servidor.
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * CORS restrictivo: por defecto solo se acepta el mismo origen. Para permitir
 * otros dominios hay que enumerarlos en CORS_ORIGINS.
 */
export function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
