/**
 * Montaje de todas las rutas de la API bajo /api.
 */

import { Router } from 'express';

import { metaRouter } from './meta.routes.js';
import { scriptRouter } from './script.routes.js';
import { ttsRouter } from './tts.routes.js';
import { audioRouter } from './audio.routes.js';
import { projectsRouter } from './projects.routes.js';

export const apiRouter = Router();

apiRouter.use('/', metaRouter);
apiRouter.use('/script', scriptRouter);
apiRouter.use('/tts', ttsRouter);
apiRouter.use('/audio', audioRouter);
apiRouter.use('/projects', projectsRouter);
