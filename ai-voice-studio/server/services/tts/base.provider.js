/**
 * Contrato del servicio de voz (requisitos 14 y 15).
 *
 * Todos los proveedores TTS exponen la misma interfaz, de modo que la
 * aplicacion nunca depende de una API concreta:
 *
 *   listVoices()  -> catalogo de voces normalizado
 *   synthesize()  -> audio a partir de un PLAN DE INTERPRETACION
 *
 * @typedef {object} Voice
 * @property {string} id            Identificador en el proveedor.
 * @property {string} name          Nombre real de la voz.
 * @property {'male'|'female'|'neutral'} gender
 * @property {string} language      Codigo BCP-47 (es-CO, en-US...).
 * @property {string} languageLabel Idioma en castellano ("Espanol (Colombia)").
 * @property {string} accent        Acento o region.
 * @property {string} description   Caracteristicas de la voz.
 * @property {string[]} tags        Etiquetas cortas para la interfaz.
 * @property {string} provider
 *
 * @typedef {object} SynthesisResult
 * @property {Buffer} buffer
 * @property {'mp3'|'wav'} format
 * @property {number} sampleRate
 * @property {number} durationSeconds
 * @property {string[]} notes  Avisos honestos sobre lo que el motor no soporta.
 */

export class TtsProvider {
  /**
   * @param {string} id
   * @param {object} [capabilities]
   */
  constructor(id, capabilities = {}) {
    this.id = id;
    this.capabilities = {
      ssml: false,
      perSentenceProsody: false,
      rate: false,
      pitch: false,
      volume: false,
      breaks: false,
      styles: false,
      formats: ['mp3'],
      needsKey: true,
      ...capabilities,
    };
  }

  /** @returns {Promise<Voice[]>} */
  async listVoices() {
    return [];
  }

  /**
   * Los implementadores reciben (plan, { voiceId, format, style }), donde
   * `plan` es el resultado de `buildPerformance()`.
   * @returns {Promise<SynthesisResult>}
   */
  async synthesize() {
    throw new Error(`El proveedor de voz "${this.id}" no implementa synthesize().`);
  }

  supportsFormat(format) {
    return this.capabilities.formats.includes(format);
  }
}

/** Nombres de idioma en castellano para el catalogo de voces. */
const LANGUAGE_NAMES = {
  es: 'Espanol', en: 'Ingles', pt: 'Portugues', fr: 'Frances', it: 'Italiano',
  de: 'Aleman', ca: 'Catalan', gl: 'Gallego', eu: 'Euskera', ja: 'Japones',
  zh: 'Chino', ko: 'Coreano', ar: 'Arabe', ru: 'Ruso', nl: 'Neerlandes',
  pl: 'Polaco', tr: 'Turco', hi: 'Hindi', sv: 'Sueco', da: 'Danes', no: 'Noruego',
};

const REGION_NAMES = {
  ES: 'Espana', MX: 'Mexico', CO: 'Colombia', AR: 'Argentina', CL: 'Chile',
  PE: 'Peru', US: 'Estados Unidos', GB: 'Reino Unido', VE: 'Venezuela',
  EC: 'Ecuador', UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', CR: 'Costa Rica',
  PA: 'Panama', DO: 'Republica Dominicana', GT: 'Guatemala', CU: 'Cuba',
  PR: 'Puerto Rico', BR: 'Brasil', PT: 'Portugal', FR: 'Francia', IT: 'Italia',
  DE: 'Alemania', CA: 'Canada', AU: 'Australia', IN: 'India', IE: 'Irlanda',
};

/** Convierte "es-CO" en "Espanol (Colombia)". */
export function languageLabel(code = '') {
  const [language, region] = String(code).split('-');
  const base = LANGUAGE_NAMES[String(language).toLowerCase()] || code || 'Desconocido';
  const place = REGION_NAMES[String(region || '').toUpperCase()];
  return place ? `${base} (${place})` : base;
}

/** Deduce el genero a partir del nombre o de los metadatos del proveedor. */
export function normalizeGender(value = '') {
  const text = String(value).toLowerCase();
  if (text.includes('female') || text.includes('femen') || text === 'f') return 'female';
  if (text.includes('male') || text.includes('mascul') || text === 'm') return 'male';
  return 'neutral';
}

export { LANGUAGE_NAMES, REGION_NAMES };
