/**
 * Almacenamiento en memoria.
 *
 * Util para pruebas automatizadas y para entornos efimeros (contenedores sin
 * disco persistente). Todo se pierde al reiniciar el proceso.
 */

import { config } from '../../config.js';
import { Storage, isValidId } from './base.storage.js';

export class MemoryStorage extends Storage {
  constructor() {
    super('memory');
    this.audio = new Map();
    this.projects = new Map();
  }

  async saveAudio(id, buffer, meta = {}) {
    const record = {
      id,
      format: meta.format === 'wav' ? 'wav' : 'mp3',
      bytes: buffer.length,
      durationSeconds: meta.durationSeconds || 0,
      createdAt: new Date().toISOString(),
      meta: meta.meta || {},
    };
    this.audio.set(id, { ...record, buffer });
    return record;
  }

  async readAudio(id) {
    if (!isValidId(id)) return null;
    return this.audio.get(id) || null;
  }

  async deleteAudio(id) {
    return this.audio.delete(id);
  }

  async listProjects() {
    return [...this.projects.values()].sort((a, b) =>
      String(b.updatedAt).localeCompare(String(a.updatedAt)),
    );
  }

  async getProject(id) {
    return this.projects.get(id) || null;
  }

  async saveProject(project) {
    this.projects.set(project.id, project);
    return project;
  }

  async deleteProject(id) {
    return this.projects.delete(id);
  }

  async cleanup() {
    const limit = Date.now() - config.storage.audioRetentionHours * 3600 * 1000;
    const referenced = new Set([...this.projects.values()].map((p) => p.audio?.id).filter(Boolean));
    let removed = 0;
    for (const [id, record] of this.audio) {
      if (referenced.has(id)) continue;
      if (new Date(record.createdAt).getTime() < limit) {
        this.audio.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}
