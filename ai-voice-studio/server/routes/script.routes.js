/**
 * Rutas del guion: estadisticas, analisis de interpretacion, optimizador y
 * modo Shorts.
 */

import { Router } from 'express';

import { config } from '../config.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { readScript, readSettings, requireObject } from '../middleware/validate.js';
import { computeStats, shortsReport } from '../services/script/stats.js';
import { buildPerformance } from '../services/script/director.js';
import { analyzeScript, optimizeScript } from '../services/ai/index.js';
import { clamp } from '../services/script/text.js';

export const scriptRouter = Router();

/** Limitador especifico para las operaciones que llaman a la IA. */
const heavy = rateLimit({ max: config.limits.rateHeavyMax, scope: 'ai' });

/**
 * Estadisticas del guion (requisito 12).
 * Es una operacion local y barata: la interfaz la llama mientras se escribe.
 */
scriptRouter.post(
  '/stats',
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const script = readScript(body, { required: false });
    const settings = readSettings(body);

    res.json({
      stats: computeStats(script, {
        styleId: settings.styleId,
        speed: settings.controls.speed,
        pauseScale: settings.controls.pauses,
      }),
    });
  }),
);

/**
 * Analisis de interpretacion (requisito 5).
 * Devuelve tanto el analisis como el plan resultante, para que la interfaz
 * pueda mostrar por que se ha decidido cada cosa.
 */
scriptRouter.post(
  '/analyze',
  heavy,
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const script = readScript(body);
    const settings = readSettings(body);

    const analysis = await analyzeScript(script, { styleId: settings.styleId });
    const plan = buildPerformance({
      script,
      analysis,
      styleId: settings.styleId,
      controls: settings.controls,
      autoInterpret: settings.autoInterpret,
    });

    res.json({
      analysis: {
        provider: analysis.provider,
        language: analysis.language,
        tone: analysis.tone,
        summary: analysis.summary,
        sentences: analysis.sentences,
        scenes: analysis.scenes,
        highlights: analysis.highlights,
        warnings: analysis.warnings,
        degraded: Boolean(analysis.degraded),
        degradedReason: analysis.degradedReason,
      },
      plan: {
        styleId: plan.styleId,
        styleLabel: plan.styleLabel,
        estimatedSeconds: plan.estimatedSeconds,
        segments: plan.segments,
        markers: plan.markers,
        warnings: plan.warnings,
      },
      stats: computeStats(script, {
        styleId: settings.styleId,
        speed: settings.controls.speed,
        pauseScale: settings.controls.pauses,
      }),
    });
  }),
);

/**
 * Optimizador de guiones (requisito 7).
 * IMPORTANTE: nunca sustituye el guion original; devuelve las dos versiones
 * y la lista de cambios para que el usuario acepte o rechace.
 */
scriptRouter.post(
  '/optimize',
  heavy,
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const script = readScript(body);
    const settings = readSettings(body);
    const goals = Array.isArray(body.goals)
      ? body.goals.filter((goal) => typeof goal === 'string').slice(0, 10)
      : [];

    const result = await optimizeScript(script, { styleId: settings.styleId, goals });

    res.json({
      provider: result.provider,
      original: result.original,
      optimized: result.optimized,
      changed: result.changed,
      changes: result.changes,
      notes: result.notes,
      stats: result.stats,
      degraded: Boolean(result.degraded),
      degradedReason: result.degradedReason,
      statsOriginal: computeStats(result.original, { styleId: settings.styleId }),
      statsOptimized: computeStats(result.optimized, { styleId: settings.styleId }),
    });
  }),
);

/** Modo Shorts / Reels / TikTok (requisito 11). */
scriptRouter.post(
  '/shorts',
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const script = readScript(body);
    const settings = readSettings(body);
    const targetSeconds = clamp(body.targetSeconds ?? 45, 10, 180);

    res.json(
      shortsReport(script, {
        styleId: settings.styleId,
        speed: settings.controls.speed,
        pauseScale: settings.controls.pauses,
        targetSeconds,
      }),
    );
  }),
);
