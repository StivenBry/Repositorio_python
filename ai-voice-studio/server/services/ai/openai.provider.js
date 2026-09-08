/**
 * Proveedor de IA: OpenAI (API de pago).
 *
 * Configuracion necesaria en .env:
 *   AI_PROVIDER=openai
 *   OPENAI_API_KEY=sk-...
 *   OPENAI_AI_MODEL=gpt-4o-mini   (opcional)
 */

import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { logger } from '../../logger.js';
import { requestJson } from '../http.js';
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

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

async function ask({ system, user }) {
  const apiKey = config.ai.openai.apiKey;
  if (!apiKey) throw errors.providerNotConfigured('ai');

  const data = await requestJson(
    ENDPOINT,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.openai.model,
        // Fuerza una respuesta JSON valida y evita textos alrededor.
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    },
    { label: 'servicio de inteligencia artificial', timeoutMs: 90_000 },
  );

  return data?.choices?.[0]?.message?.content || '';
}

export class OpenAiProvider extends AiProvider {
  constructor() {
    super('openai');
  }

  async analyze(script, options = {}) {
    const baseline = analyzeHeuristic(script, options);
    if (!baseline.sentences.length) return baseline;

    const raw = await ask({
      system: analysisSystemPrompt(),
      user: analysisUserPrompt(baseline.sentences, { ...options, language: baseline.language }),
    });

    const data = parseJsonResponse(raw);
    if (!data) {
      logger.warn('OpenAI devolvio un analisis no interpretable; se usa el analisis local.');
      return baseline;
    }
    return mergeAnalysis(baseline, data, this.id);
  }

  async optimize(script, options = {}) {
    const fallback = optimizeHeuristic(script, options);
    const raw = await ask({
      system: optimizeSystemPrompt(),
      user: optimizeUserPrompt(script, { ...options, language: fallback.language }),
    });

    const data = parseJsonResponse(raw);
    if (!data) {
      logger.warn('OpenAI devolvio una optimizacion no interpretable; se usa la optimizacion local.');
      return fallback;
    }
    return mergeOptimization(script, data, fallback, this.id);
  }
}
