/**
 * Contrato de la capa de almacenamiento (requisito 14).
 *
 * Separar el almacenamiento permite pasar de disco local a un bucket S3 o a
 * una base de datos sin tocar rutas ni interfaz: basta con implementar estos
 * metodos y registrar el nuevo driver.
 *
 * @typedef {object} StoredAudio
 * @property {string} id
 * @property {'mp3'|'wav'} format
 * @property {number} bytes
 * @property {number} durationSeconds
 * @property {object} meta
 * @property {string} createdAt
 */

export class Storage {
  constructor(id) {
    this.id = id;
  }

  /*
   * Los metodos siguientes definen el contrato. Cada driver los sobrescribe
   * con la firma documentada arriba; aqui se declaran sin parametros porque
   * lo unico que hacen es avisar de que faltan por implementar.
   */

  async init() {}

  /* --- Audio -------------------------------------------------------- */
  async saveAudio() {
    throw new Error('saveAudio() no implementado.');
  }

  async readAudio() {
    throw new Error('readAudio() no implementado.');
  }

  async deleteAudio() {
    throw new Error('deleteAudio() no implementado.');
  }

  /* --- Proyectos ---------------------------------------------------- */
  async listProjects() {
    return [];
  }

  async getProject() {
    return null;
  }

  async saveProject() {
    throw new Error('saveProject() no implementado.');
  }

  async deleteProject() {
    return false;
  }

  /** Borra los audios caducados. Devuelve cuantos se eliminaron. */
  async cleanup() {
    return 0;
  }
}

/** Identificadores validos: solo UUID, para evitar rutas manipuladas. */
export const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}
