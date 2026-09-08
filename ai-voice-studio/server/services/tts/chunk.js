/**
 * Troceado del plan de interpretacion.
 *
 * Algunos proveedores limitan el tamano de cada peticion (Google admite
 * 5000 bytes de SSML). Este ayudante parte el plan por frases completas, sin
 * cortar nunca una palabra, y devuelve varios subplanes equivalentes.
 */

/**
 * @param {object} plan
 * @param {number} maxChars Presupuesto aproximado de caracteres por trozo.
 * @returns {object[]} lista de subplanes
 */
export function chunkPlan(plan, maxChars = 3500) {
  if (!plan.segments.length) return [plan];

  const chunks = [];
  let current = [];
  let size = 0;

  for (const segment of plan.segments) {
    // Cada frase suma su texto mas el margen del marcado que la envuelve.
    const cost = segment.text.length + 160;
    if (current.length && size + cost > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(segment);
    size += cost;
  }
  if (current.length) chunks.push(current);

  return chunks.map((segments, index) => ({
    ...plan,
    segments,
    leadingSilenceMs: index === 0 ? plan.leadingSilenceMs : 0,
    text: segments.map((segment) => segment.text).join(' '),
  }));
}
