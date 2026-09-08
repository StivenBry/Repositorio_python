/**
 * Proveedor de IA: Google Gemini (API con capa gratuita y de pago).
 *
 * Configuracion necesaria en .env:
 *   AI_PROVIDER=google
 *   GOOGLE_AI_API_KEY=...
 *   GOOGLE_AI_MODEL=gemini-2.0-flash   (opcional)
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

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function ask({ system, user }) {
  const apiKey = config.ai.google.apiKey;
  if (!apiKey) throw errors.providerNotConfigured('ai');

  const model = encodeURIComponent(config.ai.google.model);
  const data = await requestJson(
    `${BASE_URL}/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    },
    { label: 'servicio de inteligencia artificial', timeoutMs: 90_000 },
  );

  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('');
}

export class GoogleAiProvider extends AiProvider {
  constructor() {
    super('google');
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
      logger.warn('Gemini devolvio un analisis no interpretable; se usa el analisis local.');
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
      logger.warn('Gemini devolvio una optimizacion no interpretable; se usa la optimizacion local.');
      return fallback;
    }
    return mergeOptimization(script, data, fallback, this.id);
  }
}
