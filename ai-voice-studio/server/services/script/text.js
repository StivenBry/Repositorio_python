/**
 * Utilidades de texto compartidas por todo el motor de guion.
 *
 * Nota de implementacion: los caracteres invisibles (marcas combinantes,
 * controles, espacios de ancho cero) se tratan con clases Unicode
 * (\p{M}, \p{Cc}, \p{Cf}, \p{Zs}) en lugar de rangos literales, para que el
 * codigo fuente siga siendo legible y 100 % ASCII.
 */

/** Quita tildes y diacriticos; util para comparar palabras clave. */
export function deburr(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Normaliza para comparaciones: sin tildes, en minusculas y sin espacios extra. */
export function normalizeKey(value = '') {
  return deburr(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Saneado defensivo del texto recibido del navegador (requisito 17).
 * - Normaliza los saltos de linea a "\n" conservando los parrafos.
 * - Elimina caracteres de control e invisibles que rompen los motores TTS.
 * - Unifica comillas y apostrofes tipograficos.
 * - No interpreta HTML ni ejecuta nada: el texto sigue siendo texto plano.
 */
export function sanitizeScript(value = '') {
  return String(value)
    .replace(/\r\n?/g, '\n')
    // Espacios "raros" (duro, fino, ideografico...) -> espacio normal.
    .replace(/\p{Zs}/gu, ' ')
    // Formato invisible: ancho cero, marcas de direccionalidad, BOM.
    .replace(/\p{Cf}/gu, '')
    // Controles, conservando unicamente el salto de linea y el tabulador.
    .replace(/\p{Cc}/gu, (char) => (char === '\n' || char === '\t' ? char : ''))
    // Apostrofes y comillas tipograficas -> ASCII (mejor pronunciacion).
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    // Como maximo dos saltos seguidos: separa parrafos sin huecos enormes.
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trimEnd();
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;

/** Cuenta palabras reales (ignora signos sueltos). */
export function countWords(value = '') {
  const matches = String(value).match(WORD_RE);
  return matches ? matches.length : 0;
}

/** Devuelve las palabras en minusculas y sin tildes, para los lexicos. */
export function words(value = '') {
  const matches = String(value).match(WORD_RE);
  return matches ? matches.map((word) => deburr(word).toLowerCase()) : [];
}

/** Escapa los caracteres reservados de XML/SSML. */
export function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convierte un titulo en un nombre de archivo seguro. */
export function slugify(value = '', fallback = 'narracion') {
  const slug = deburr(String(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

/** Recorta un numero al rango indicado. */
export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

/** Redondea a los decimales indicados (evita 0.30000000000000004). */
export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
}
