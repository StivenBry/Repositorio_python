/**
 * Contrato del servicio de IA.
 *
 * Cualquier proveedor (Claude, OpenAI, Gemini, o uno futuro) debe exponer
 * estos dos metodos. La aplicacion nunca llama a una API concreta: siempre
 * pasa por esta interfaz, de modo que cambiar de proveedor es cambiar una
 * variable de entorno (requisito 15).
 *
 * @typedef {object} SentenceAnalysis
 * @property {number}  index                Posicion de la frase en el guion.
 * @property {string}  kind                 statement|question|exclamation|dialogue|heading|list-item
 * @property {string}  emotion              neutral|joy|sadness|anger|tension|awe|calm|urgency|hope
 * @property {number}  intensity            0..1
 * @property {number}  importance           0..1
 * @property {number}  emphasis             0..1
 * @property {string[]} emphasisWords       Palabras a resaltar.
 * @property {number}  rateFactor           Multiplicador de velocidad (0.7..1.35).
 * @property {number}  pitchFactor          Desplazamiento de tono (-0.35..0.35).
 * @property {number}  extraPauseMs         Silencio adicional despues de la frase.
 * @property {number}  extraPauseBeforeMs   Silencio adicional antes de la frase.
 * @property {boolean} topicShift           La frase abre un giro narrativo.
 * @property {('start'|'end'|null)} scene   Limite de escena.
 * @property {string}  note                 Explicacion para la interfaz.
 *
 * @typedef {object} ScriptAnalysis
 * @property {string} provider
 * @property {string} language
 * @property {string} tone
 * @property {string} summary
 * @property {SentenceAnalysis[]} sentences
 * @property {object[]} scenes
 * @property {object[]} highlights
 * @property {string[]} warnings
 *
 * @typedef {object} ScriptOptimization
 * @property {string} provider
 * @property {string} original
 * @property {string} optimized
 * @property {boolean} changed
 * @property {Array<{type:string,title:string,detail:string}>} changes
 * @property {Array<{type:string,title:string,detail:string}>} notes
 */

export class AiProvider {
  /** @param {string} id */
  constructor(id) {
    this.id = id;
  }

  /**
   * Los implementadores reciben (script, options).
   * @returns {Promise<ScriptAnalysis>}
   */
  async analyze() {
    throw new Error(`El proveedor de IA "${this.id}" no implementa analyze().`);
  }

  /**
   * Los implementadores reciben (script, options).
   * @returns {Promise<ScriptOptimization>}
   */
  async optimize() {
    throw new Error(`El proveedor de IA "${this.id}" no implementa optimize().`);
  }
}

/** Familias emocionales validas (las comparten todos los proveedores). */
export const VALID_EMOTIONS = [
  'neutral', 'joy', 'sadness', 'anger', 'tension', 'awe', 'calm', 'urgency', 'hope',
];

/** Tipos de frase validos. */
export const VALID_KINDS = [
  'statement', 'question', 'exclamation', 'dialogue', 'heading', 'list-item',
];
