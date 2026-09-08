/**
 * Proveedor de IA: Anthropic Claude (API de pago).
 *
 * Configuracion necesaria en .env:
 *   AI_PROVIDER=anthropic
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   ANTHROPIC_MODEL=claude-opus-5   (opcional)
 *
 * Se usa el SDK oficial `@anthropic-ai/sdk`, cargado de forma perezosa para
 * que la aplicacion arranque igual aunque el paquete no este instalado o el
 * proveedor no se utilice.
 */

import { config } from '../../config.js';
import { AppError, errors } from '../../errors.js';
import { logger } from '../../logger.js';
import { AiProvider } from './base.provider.js';
import {
  analysisSystemPrompt,
  analysisUserPrompt,
  mergeAnalysis,
  mergeOptimization,
  optimizeSystemPrompt,
  optimizeUserPrompt,
  parseJsonResponse,
} from './prompt.js';
import { analyzeHeuristic, optimizeHeuristic } from './heuristic.provider.js';

let clientPromise = null;

async function getClient() {
  if (!config.ai.anthropic.apiKey) throw errors.providerNotConfigured('ai');
  if (!clientPromise) {
    clientPromise = import('@anthropic-ai/sdk')
      .then(({ default: Anthropic }) => ({
        Anthropic,
        client: new Anthropic({ apiKey: config.ai.anthropic.apiKey, maxRetries: 2, timeout: 90_000 }),
      }))
      .catch((error) => {
        clientPromise = null;
        throw new AppError('PROVIDER_NOT_CONFIGURED', 'El servicio de inteligencia artificial no esta disponible.', {
          status: 503,
          hint: 'Falta instalar las dependencias del servidor (npm install).',
          cause: error,
        });
      });
  }
  return clientPromise;
}

/** Traduce los errores del SDK a mensajes claros para el usuario. */
function translate(error, Anthropic) {
  if (error instanceof AppError) return error;
  if (Anthropic) {
    if (error instanceof Anthropic.AuthenticationError) {
      return new AppError('PROVIDER_AUTH', 'La clave del servicio de inteligencia artificial no es valida.', {
        status: 502,
        hint: 'Un administrador debe revisar ANTHROPIC_API_KEY en el archivo .env.',
        cause: error,
      });
    }
    if (error instanceof Anthropic.RateLimitError) return errors.quotaExceeded();
    if (error instanceof Anthropic.APIConnectionError) return errors.network(error);
    if (error instanceof Anthropic.APIError) return errors.providerUnavailable(error);
  }
  return errors.providerUnavailable(error);
}

/** Extrae el texto de la respuesta (ignora los bloques de razonamiento). */
function textOf(message) {
  return (message?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

async function ask({ system, user, maxTokens, effort }) {
  const { Anthropic, client } = await getClient();
  try {
    const message = await client.messages.create({
      model: config.ai.anthropic.model,
      max_tokens: maxTokens,
      system,
      // El razonamiento adaptativo esta activo por defecto en esta familia de
      // modelos; con "effort" bajo/medio se controla el coste y la latencia.
      output_config: { effort },
      messages: [{ role: 'user', content: user }],
    });

    if (message.stop_reason === 'refusal') {
      throw new AppError('PROVIDER_REJECTED', 'El servicio de inteligencia artificial no pudo procesar este guion.', {
        status: 502,
        hint: 'Revisa el contenido del guion e intentalo de nuevo.',
      });
    }
    return textOf(message);
  } catch (error) {
    throw translate(error, Anthropic);
  }
}

export class AnthropicAiProvider extends AiProvider {
  constructor() {
    super('anthropic');
  }

  async analyze(script, options = {}) {
    const baseline = analyzeHeuristic(script, options);
    if (!baseline.sentences.length) return baseline;

    const raw = await ask({
      system: analysisSystemPrompt(),
      user: analysisUserPrompt(baseline.sentences, { ...options, language: baseline.language }),
      maxTokens: 16000,
      effort: 'low',
    });

    const data = parseJsonResponse(raw);
    if (!data) {
      logger.warn('Claude devolvio un analisis no interpretable; se usa el analisis local.');
      return baseline;
    }
    return mergeAnalysis(baseline, data, this.id);
  }

  async optimize(script, options = {}) {
    const fallback = optimizeHeuristic(script, options);

    const raw = await ask({
      system: optimizeSystemPrompt(),
      user: optimizeUserPrompt(script, { ...options, language: fallback.language }),
      maxTokens: 16000,
      effort: 'medium',
    });

    const data = parseJsonResponse(raw);
    if (!data) {
      logger.warn('Claude devolvio una optimizacion no interpretable; se usa la optimizacion local.');
      return fallback;
    }
    return mergeOptimization(script, data, fallback, this.id);
  }
}
