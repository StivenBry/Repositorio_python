/**
 * Capa de abstraccion "AI Service" (requisito 15).
 *
 * El resto de la aplicacion solo conoce estas dos funciones. Cambiar de
 * proveedor es cambiar `AI_PROVIDER` en el archivo .env: no hay que tocar
 * rutas, interfaz ni motor de voz.
 *
 * Politica de resiliencia: si el proveedor externo falla, se registra el
 * problema y se responde con el analisis heuristico local, de modo que el
 * usuario nunca se queda sin poder generar su narracion (requisito 16).
 */

import { config, aiCredential } from '../../config.js';
import { logger } from '../../logger.js';
import { AppError } from '../../errors.js';
import { analyzeHeuristic, optimizeHeuristic } from './heuristic.provider.js';
import { AnthropicAiProvider } from './anthropic.provider.js';
import { OpenAiProvider } from './openai.provider.js';
import { GoogleAiProvider } from './google.provider.js';
import { AiProvider } from './base.provider.js';

/** Proveedor local: envoltorio del motor heuristico. */
class HeuristicAiProvider extends AiProvider {
  constructor() {
    super('heuristic');
  }

  async analyze(script, options) {
    return analyzeHeuristic(script, options);
  }

  async optimize(script, options) {
    return optimizeHeuristic(script, options);
  }
}

const FACTORIES = {
  heuristic: () => new HeuristicAiProvider(),
  anthropic: () => new AnthropicAiProvider(),
  openai: () => new OpenAiProvider(),
  google: () => new GoogleAiProvider(),
};

const cache = new Map();

/** Devuelve (y memoriza) la instancia del proveedor solicitado. */
export function getAiProvider(id = config.ai.provider) {
  const key = FACTORIES[id] ? id : 'heuristic';
  if (!cache.has(key)) cache.set(key, FACTORIES[key]());
  return cache.get(key);
}

/** Proveedor efectivo: cae en el heuristico si falta la credencial. */
function activeProvider() {
  const id = config.ai.provider;
  if (id !== 'heuristic' && !aiCredential(id)) {
    logger.debug(`El proveedor de IA "${id}" no tiene clave; se usa el analisis heuristico.`);
    return getAiProvider('heuristic');
  }
  return getAiProvider(id);
}

/**
 * Analiza el guion y devuelve el mapa de interpretacion.
 * @param {string} script
 * @param {object} [options] { styleId, language }
 */
export async function analyzeScript(script, options = {}) {
  const provider = activeProvider();
  try {
    const analysis = await provider.analyze(script, options);
    return { ...analysis, provider: analysis.provider || provider.id, degraded: false };
  } catch (error) {
    if (provider.id === 'heuristic') throw error;
    logger.warn(`Fallo el analisis con "${provider.id}"; se responde con el analisis local.`, {
      code: error instanceof AppError ? error.code : 'UNKNOWN',
    });
    return {
      ...analyzeHeuristic(script, options),
      degraded: true,
      degradedReason:
        'El servicio de inteligencia artificial no respondio, asi que se aplico el analisis incluido en la aplicacion.',
    };
  }
}

/**
 * Propone una version mejorada del guion. Nunca sustituye al original.
 * @param {string} script
 * @param {object} [options] { styleId, goals }
 */
export async function optimizeScript(script, options = {}) {
  const provider = activeProvider();
  try {
    const result = await provider.optimize(script, options);
    return { ...result, provider: result.provider || provider.id, degraded: false };
  } catch (error) {
    if (provider.id === 'heuristic') throw error;
    logger.warn(`Fallo la optimizacion con "${provider.id}"; se responde con la version local.`, {
      code: error instanceof AppError ? error.code : 'UNKNOWN',
    });
    return {
      ...optimizeHeuristic(script, options),
      degraded: true,
      degradedReason:
        'El servicio de inteligencia artificial no respondio, asi que se aplicaron las mejoras basicas incluidas en la aplicacion.',
    };
  }
}

/** Informacion del motor de IA para la interfaz (sin credenciales). */
export function aiInfo() {
  return {
    provider: config.ai.provider,
    configured: Boolean(aiCredential()),
    effective: activeProvider().id,
  };
}
