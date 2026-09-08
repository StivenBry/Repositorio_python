/**
 * Entrega del audio generado: reproduccion en la aplicacion y descarga
 * (requisitos 8 y 9).
 */

import { Router } from 'express';

import { errors } from '../errors.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { getStorage } from '../services/storage/index.js';
import { isValidId } from '../services/storage/base.storage.js';
import { ensureFormat, availableFormats } from '../services/audio/convert.js';
import { slugify } from '../services/script/text.js';

export const audioRouter = Router();

const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav' };

/** Reproduccion con soporte de rangos, para poder desplazarse por la barra. */
audioRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) throw errors.notFound('El audio solicitado');

    const record = await getStorage().readAudio(id);
    if (!record) throw errors.notFound('El audio solicitado');

    const { buffer, format } = record;
    const total = buffer.length;
    const type = MIME[format] || 'application/octet-stream';

    res.setHeader('Content-Type', type);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match?.[2] ? Number.parseInt(match[2], 10) : total - 1;

      if (!Number.isFinite(start) || start >= total || start < 0) {
        res.setHeader('Content-Range', `bytes */${total}`);
        res.status(416).end();
        return;
      }

      const last = Math.min(end, total - 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${last}/${total}`);
      res.setHeader('Content-Length', String(last - start + 1));
      res.end(buffer.subarray(start, last + 1));
      return;
    }

    res.setHeader('Content-Length', String(total));
    res.end(buffer);
  }),
);

/**
 * Descarga en MP3 o WAV. Si el audio guardado esta en otro formato, se
 * convierte al vuelo; si no es posible, se explica por que.
 */
audioRouter.get(
  '/:id/download',
  asyncRoute(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) throw errors.notFound('El audio solicitado');

    const record = await getStorage().readAudio(id);
    if (!record) throw errors.notFound('El audio solicitado');

    const wanted = req.query.format === 'wav' ? 'wav' : req.query.format === 'mp3' ? 'mp3' : record.format;
    if (wanted !== record.format && wanted === 'wav' && !availableFormats().ffmpeg) {
      throw errors.conversionUnavailable('wav');
    }

    const result = await ensureFormat(record.buffer, record.format, wanted);
    const base = slugify(req.query.name || record.meta?.projectName || 'narracion', 'narracion');
    const filename = `${base}.${result.format}`;

    res.setHeader('Content-Type', MIME[result.format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(result.buffer.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(result.buffer);
  }),
);
