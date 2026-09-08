/**
 * Rutas de generacion de voz (requisito 8).
 *
 * El flujo se parte en dos llamadas reales para que la barra de progreso de
 * la interfaz refleje trabajo de verdad y no una animacion falsa:
 *
 *   1. POST /api/script/analyze  -> "Analizando guion" + "Preparando interpretacion"
 *   2. POST /api/tts/generate    -> "Generando voz" + "Procesando audio"
 *
 * `generate` acepta el analisis ya calculado en el paso 1 para no repetir la
 * llamada a la IA (y no cobrarla dos veces).
 */

import crypto from 'node:crypto';
import { Router } from 'express';

import { config } from '../config.js';
import { errors } from '../errors.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { readScript, readSettings, readName, requireObject } from '../middleware/validate.js';
import { buildPerformance } from '../services/script/director.js';
import { analyzeScript } from '../services/ai/index.js';
import { synthesize, listVoices, ttsInfo } from '../services/tts/index.js';
import { getStorage } from '../services/storage/index.js';
import { computeStats } from '../services/script/stats.js';
import { slugify } from '../services/script/text.js';
import { VALID_EMOTIONS, VALID_KINDS } from '../services/ai/base.provider.js';

export const ttsRouter = Router();

const heavy = rateLimit({ max: config.limits.rateHeavyMax, scope: 'tts' });

/**
 * Comprueba que el analisis recibido del cliente sea coherente con el guion.
 * Si no lo es, se ignora y se vuelve a calcular en el servidor: el cliente
 * nunca puede inyectar datos arbitrarios en el motor.
 */
function acceptClientAnalysis(analysis, script) {
  if (!analysis || typeof analysis !== 'object' || !Array.isArray(analysis.sentences)) return null;
  if (!analysis.sentences.length || analysis.sentences.length > 2000) return null;

  const sentences = analysis.sentences
    .filter((item) => Number.isInteger(item?.index))
    .map((item) => ({
      index: item.index,
      kind: VALID_KINDS.includes(item.kind) ? item.kind : 'statement',
      emotion: VALID_EMOTIONS.includes(item.emotion) ? item.emotion : 'neutral',
      intensity: Number(item.intensity) || 0.5,
      importance: Number(item.importance) || 0.4,
      emphasis: Number(item.emphasis) || 0,
      emphasisWords: Array.isArray(item.emphasisWords) ? item.emphasisWords.slice(0, 6) : [],
      rateFactor: Number(item.rateFactor) || 1,
      pitchFactor: Number(item.pitchFactor) || 0,
      extraPauseMs: Number(item.extraPauseMs) || 0,
      extraPauseBeforeMs: Number(item.extraPauseBeforeMs) || 0,
      topicShift: Boolean(item.topicShift),
      scene: ['start', 'end'].includes(item.scene) ? item.scene : null,
      note: typeof item.note === 'string' ? item.note.slice(0, 220) : '',
    }));

  if (!sentences.length) return null;

  // El numero de frases debe coincidir con el del guion recibido.
  const expected = computeStats(script).sentences;
  if (sentences.length !== expected) return null;

  return {
    provider: typeof analysis.provider === 'string' ? analysis.provider.slice(0, 20) : 'cliente',
    language: typeof analysis.language === 'string' ? analysis.language.slice(0, 8) : 'es',
    tone: typeof analysis.tone === 'string' ? analysis.tone.slice(0, 40) : 'neutral',
    sentences,
  };
}

/** Genera la narracion completa. */
ttsRouter.post(
  '/generate',
  heavy,
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const script = readScript(body);
    const settings = readSettings(body);
    const projectName = readName(body.projectName, 'narracion');

    const info = ttsInfo();
    if (settings.format === 'wav' && !info.downloadFormats.wav) {
      throw errors.conversionUnavailable('wav');
    }

    // 1. Analisis: se reutiliza el del cliente si es coherente.
    let analysis = acceptClientAnalysis(body.analysis, script);
    if (!analysis) {
      analysis = await analyzeScript(script, { styleId: settings.styleId });
    }

    // 2. Plan de interpretacion.
    const plan = buildPerformance({
      script,
      analysis,
      styleId: settings.styleId,
      controls: settings.controls,
      autoInterpret: settings.autoInterpret,
    });

    if (!plan.segments.length) throw errors.emptyScript();

    // 3. Voz: si no llega ninguna, se toma la primera del catalogo.
    let voiceId = settings.voiceId;
    if (!voiceId) {
      const voices = await listVoices();
      voiceId = voices[0]?.id || '';
    }

    // 4. Sintesis y almacenamiento.
    const audio = await synthesize(plan, { voiceId, format: settings.format });
    const id = crypto.randomUUID();
    const stored = await getStorage().saveAudio(id, audio.buffer, {
      format: audio.format,
      durationSeconds: audio.durationSeconds || plan.estimatedSeconds,
      meta: {
        projectName,
        voiceId,
        styleId: plan.styleId,
        provider: audio.provider,
        words: plan.words,
      },
    });

    const filename = `${slugify(projectName, 'narracion')}.${stored.format}`;

    res.json({
      audio: {
        id,
        url: `/api/audio/${id}`,
        downloadUrl: `/api/audio/${id}/download`,
        filename,
        format: stored.format,
        bytes: stored.bytes,
        durationSeconds: stored.durationSeconds,
        createdAt: stored.createdAt,
      },
      provider: audio.provider,
      voiceId,
      plan: {
        styleId: plan.styleId,
        styleLabel: plan.styleLabel,
        estimatedSeconds: plan.estimatedSeconds,
        segments: plan.segments.length,
        markers: plan.markers,
      },
      notes: [...audio.notes, ...plan.warnings],
      formats: info.downloadFormats,
    });
  }),
);

/** Prueba rapida de una voz (boton "Probar voz" del requisito 2). */
ttsRouter.post(
  '/preview',
  rateLimit({ max: config.limits.rateHeavyMax * 2, scope: 'preview' }),
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const settings = readSettings(body);

    const sample =
      readScript(body, { max: config.limits.maxPreviewChars, required: false }) ||
      'Asi suena esta voz. Puedes ajustar la velocidad, el tono y la intensidad antes de generar tu narracion.';

    const plan = buildPerformance({
      script: sample,
      analysis: await analyzeScript(sample, { styleId: settings.styleId }),
      styleId: settings.styleId,
      controls: settings.controls,
      autoInterpret: settings.autoInterpret,
    });

    const audio = await synthesize(plan, { voiceId: settings.voiceId, format: 'mp3' });
    const id = crypto.randomUUID();
    const stored = await getStorage().saveAudio(id, audio.buffer, {
      format: audio.format,
      durationSeconds: audio.durationSeconds || plan.estimatedSeconds,
      meta: { preview: true, voiceId: settings.voiceId },
    });

    res.json({
      audio: {
        id,
        url: `/api/audio/${id}`,
        format: stored.format,
        durationSeconds: stored.durationSeconds,
      },
      notes: audio.notes,
    });
  }),
);
