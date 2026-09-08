/**
 * Fabrica de almacenamiento: `STORAGE_DRIVER` decide la implementacion.
 */

import { config } from '../../config.js';
import { LocalStorage } from './local.storage.js';
import { MemoryStorage } from './memory.storage.js';

let instance = null;

/** Devuelve el almacenamiento activo (singleton). */
export function getStorage() {
  if (!instance) {
    instance = config.storage.driver === 'memory' ? new MemoryStorage() : new LocalStorage();
  }
  return instance;
}

/** Inicializa el almacenamiento al arrancar el servidor. */
export async function initStorage() {
  const storage = getStorage();
  await storage.init();
  return storage;
}

export { LocalStorage, MemoryStorage };
