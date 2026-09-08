/**
 * Almacenamiento en el disco del servidor.
 *
 *   data/
 *     audio/<uuid>.mp3      audio generado
 *     audio/<uuid>.json     metadatos del audio
 *     projects.json         proyectos del usuario
 *
 * Las escrituras de `projects.json` son atomicas (archivo temporal + rename)
 * para que un corte de luz no deje el archivo a medias.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { Storage, isValidId } from './base.storage.js';

export class LocalStorage extends Storage {
  constructor(dir = config.storage.dir) {
    super('local');
    this.dir = dir;
    this.audioDir = path.join(dir, 'audio');
    this.projectsFile = path.join(dir, 'projects.json');
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.audioDir, { recursive: true });
  }

  /** Ruta segura dentro de la carpeta de audio (bloquea `../`). */
  #audioPath(id, extension) {
    if (!isValidId(id)) throw new Error('Identificador de audio no valido.');
    return path.join(this.audioDir, `${id}.${extension}`);
  }

  async saveAudio(id, buffer, meta = {}) {
    await this.init();
    const format = meta.format === 'wav' ? 'wav' : 'mp3';
    const record = {
      id,
      format,
      bytes: buffer.length,
      durationSeconds: meta.durationSeconds || 0,
      createdAt: new Date().toISOString(),
      meta: meta.meta || {},
    };

    await fs.writeFile(this.#audioPath(id, format), buffer);
    await fs.writeFile(this.#audioPath(id, 'json'), JSON.stringify(record, null, 2), 'utf8');
    return record;
  }

  async readAudio(id) {
    if (!isValidId(id)) return null;
    try {
      const record = JSON.parse(await fs.readFile(this.#audioPath(id, 'json'), 'utf8'));
      const buffer = await fs.readFile(this.#audioPath(id, record.format));
      return { ...record, buffer };
    } catch {
      return null;
    }
  }

  async deleteAudio(id) {
    if (!isValidId(id)) return false;
    let deleted = false;
    for (const extension of ['mp3', 'wav', 'json']) {
      try {
        await fs.rm(this.#audioPath(id, extension), { force: true });
        deleted = true;
      } catch {
        // El archivo ya no existe: no es un error.
      }
    }
    return deleted;
  }

  async #readProjects() {
    try {
      const raw = await fs.readFile(this.projectsFile, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** Escritura atomica y serializada, para evitar carreras entre peticiones. */
  async #writeProjects(projects) {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.init();
      const temporary = `${this.projectsFile}.${process.pid}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(projects, null, 2), 'utf8');
      await fs.rename(temporary, this.projectsFile);
    });
    return this.writeQueue;
  }

  async listProjects() {
    const projects = await this.#readProjects();
    return projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async getProject(id) {
    const projects = await this.#readProjects();
    return projects.find((project) => project.id === id) || null;
  }

  async saveProject(project) {
    const projects = await this.#readProjects();
    const index = projects.findIndex((item) => item.id === project.id);
    if (index >= 0) projects[index] = project;
    else projects.unshift(project);

    // Tope de seguridad: se descartan los proyectos mas antiguos.
    const trimmed = projects
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, config.limits.maxProjects);

    await this.#writeProjects(trimmed);
    return project;
  }

  async deleteProject(id) {
    const projects = await this.#readProjects();
    const remaining = projects.filter((project) => project.id !== id);
    if (remaining.length === projects.length) return false;
    await this.#writeProjects(remaining);
    return true;
  }

  async cleanup() {
    await this.init();
    const limit = Date.now() - config.storage.audioRetentionHours * 3600 * 1000;
    let removed = 0;

    let entries = [];
    try {
      entries = await fs.readdir(this.audioDir);
    } catch {
      return 0;
    }

    // Los audios referenciados por un proyecto no se borran nunca.
    const projects = await this.#readProjects();
    const referenced = new Set(projects.map((project) => project.audio?.id).filter(Boolean));

    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const id = entry.replace(/\.json$/, '');
      if (referenced.has(id)) continue;
      try {
        const stat = await fs.stat(path.join(this.audioDir, entry));
        if (stat.mtimeMs < limit) {
          await this.deleteAudio(id);
          removed += 1;
        }
      } catch {
        // Se ignora un archivo que desaparecio mientras se recorria.
      }
    }

    if (removed) logger.info(`Limpieza: ${removed} audio(s) caducado(s) eliminado(s).`);
    return removed;
  }
}
