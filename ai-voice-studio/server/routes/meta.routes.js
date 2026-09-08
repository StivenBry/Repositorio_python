/**
 * Rutas informativas: configuracion publica, estilos, marcadores y voces.
 * Nunca exponen claves de API, solo banderas y catalogos.
 */

import { Router } from 'express';

import { publicConfig } from '../config.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { publicStyles } from '../services/script/styles.js';
import { MARKER_REFERENCE } from '../services/script/markers.js';
import { CONTROL_RANGES, DEFAULT_CONTROLS } from '../services/script/director.js';
import { listVoices, ttsInfo } from '../services/tts/index.js';
import { aiInfo } from '../services/ai/index.js';

export const metaRouter = Router();

/** Estado del servicio (util para monitorizacion y para el despliegue). */
metaRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

/** Todo lo que la interfaz necesita saber al arrancar. */
metaRouter.get('/config', (req, res) => {
  res.json({
    ...publicConfig(),
    tts: ttsInfo(),
    ai: aiInfo(),
    styles: publicStyles(),
    markers: MARKER_REFERENCE,
    controls: { ranges: CONTROL_RANGES, defaults: DEFAULT_CONTROLS },
  });
});

/** Catalogo de estilos de narracion. */
metaRouter.get('/styles', (req, res) => {
  res.json({ styles: publicStyles() });
});

/** Catalogo de voces del proveedor activo. */
metaRouter.get(
  '/voices',
  asyncRoute(async (req, res) => {
    const voices = await listVoices({ force: req.query.refresh === '1' });
    const info = ttsInfo();
    res.json({
      provider: info.effective,
      configured: info.configured,
      capabilities: info.capabilities,
      total: voices.length,
      voices,
    });
  }),
);
