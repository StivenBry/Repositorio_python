/**
 * Sistema de proyectos (requisito 10).
 *
 * Cada proyecto guarda nombre, guion, configuracion de voz, estilo, fechas y
 * el audio generado. Se almacenan mediante la capa de almacenamiento, asi que
 * pasar de disco local a otro backend no afecta a estas rutas.
 */

import crypto from 'node:crypto';
import { Router } from 'express';

import { errors } from '../errors.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { readScript, readSettings, readName, requireObject } from '../middleware/validate.js';
import { getStorage } from '../services/storage/index.js';
import { isValidId } from '../services/storage/base.storage.js';
import { computeStats } from '../services/script/stats.js';

export const projectsRouter = Router();

/** Construye el registro del proyecto a partir del cuerpo de la peticion. */
function buildProject(body, existing = null) {
  const script = readScript(body, { required: false });
  const settings = readSettings(body);
  const now = new Date().toISOString();

  const audio =
    body.audio && typeof body.audio === 'object' && isValidId(body.audio.id)
      ? {
          id: body.audio.id,
          format: body.audio.format === 'wav' ? 'wav' : 'mp3',
          bytes: Number(body.audio.bytes) || 0,
          durationSeconds: Number(body.audio.durationSeconds) || 0,
          url: `/api/audio/${body.audio.id}`,
        }
      : existing?.audio || null;

  return {
    id: existing?.id || crypto.randomUUID(),
    name: readName(body.name, existing?.name || 'Proyecto sin titulo'),
    script,
    styleId: settings.styleId,
    controls: settings.controls,
    autoInterpret: settings.autoInterpret,
    voiceId: settings.voiceId,
    voiceName: readName(body.voiceName, existing?.voiceName || ''),
    provider: readName(body.provider, existing?.provider || ''),
    format: settings.format,
    audio,
    stats: computeStats(script, {
      styleId: settings.styleId,
      speed: settings.controls.speed,
      pauseScale: settings.controls.pauses,
    }),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

/** Resumen ligero para el listado lateral. */
function summarize(project) {
  return {
    id: project.id,
    name: project.name,
    styleId: project.styleId,
    voiceName: project.voiceName,
    words: project.stats?.words || 0,
    estimatedDuration: project.stats?.estimatedDuration || '0 s',
    hasAudio: Boolean(project.audio?.id),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    preview: String(project.script || '').slice(0, 120),
  };
}

/** Lista de proyectos. */
projectsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const projects = await getStorage().listProjects();
    res.json({ total: projects.length, projects: projects.map(summarize) });
  }),
);

/** Detalle completo de un proyecto. */
projectsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    if (!isValidId(req.params.id)) throw errors.notFound('El proyecto');
    const project = await getStorage().getProject(req.params.id);
    if (!project) throw errors.notFound('El proyecto');
    res.json({ project });
  }),
);

/** Crea un proyecto nuevo. */
projectsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = requireObject(req.body);
    const project = buildProject(body);
    await getStorage().saveProject(project);
    res.status(201).json({ project });
  }),
);

/** Actualiza un proyecto existente. */
projectsRouter.put(
  '/:id',
  asyncRoute(async (req, res) => {
    if (!isValidId(req.params.id)) throw errors.notFound('El proyecto');
    const storage = getStorage();
    const existing = await storage.getProject(req.params.id);
    if (!existing) throw errors.notFound('El proyecto');

    const project = buildProject(requireObject(req.body), existing);
    await storage.saveProject(project);
    res.json({ project });
  }),
);

/** Elimina un proyecto y, si lo tiene, su audio asociado. */
projectsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    if (!isValidId(req.params.id)) throw errors.notFound('El proyecto');
    const storage = getStorage();
    const existing = await storage.getProject(req.params.id);
    if (!existing) throw errors.notFound('El proyecto');

    if (existing.audio?.id) await storage.deleteAudio(existing.audio.id);
    await storage.deleteProject(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  }),
);
