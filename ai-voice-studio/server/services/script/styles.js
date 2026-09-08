/**
 * Estilos de narracion (requisito 3).
 *
 * Cada estilo es un "preset" independiente del proveedor: define ritmo, tono,
 * energia y como se reparten las pausas. Ademas incluye las pistas concretas
 * que cada motor TTS entiende (estilo de Azure, instrucciones de OpenAI,
 * ajustes de ElevenLabs), de modo que anadir un proveedor nuevo consiste en
 * leer estos campos, no en reescribir la logica.
 */

export const NARRATION_STYLES = [
  {
    id: 'natural',
    label: 'Natural',
    icon: '🎙️',
    description: 'Lectura equilibrada y creible. Sirve para casi todo.',
    rate: 1, pitch: 0, volume: 1, pauseScale: 1, emphasisStrength: 0.45, intensity: 0.5, wpm: 150,
    azureStyle: null,
    openaiInstructions: 'Narra con voz natural y cercana, ritmo estable y articulacion clara.',
    elevenlabs: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
  },
  {
    id: 'documental',
    label: 'Documental',
    icon: '🌍',
    description: 'Pausado, grave y descriptivo, al estilo de un documental.',
    rate: 0.9, pitch: -0.18, volume: 1, pauseScale: 1.35, emphasisStrength: 0.6, intensity: 0.55, wpm: 132,
    azureStyle: 'documentary-narration',
    openaiInstructions: 'Narra como un documental: pausado, grave, descriptivo y con autoridad serena.',
    elevenlabs: { stability: 0.62, similarity_boost: 0.8, style: 0.3 },
  },
  {
    id: 'educativo',
    label: 'Educativo',
    icon: '🎓',
    description: 'Claro y didactico, con pausas que ayudan a comprender.',
    rate: 0.94, pitch: 0.02, volume: 1, pauseScale: 1.25, emphasisStrength: 0.55, intensity: 0.5, wpm: 138,
    azureStyle: 'narration-professional',
    openaiInstructions: 'Explica con tono docente: claro, ordenado, con enfasis en los conceptos clave.',
    elevenlabs: { stability: 0.6, similarity_boost: 0.78, style: 0.25 },
  },
  {
    id: 'noticias',
    label: 'Noticias',
    icon: '📰',
    description: 'Ritmo agil y neutro, propio de un informativo.',
    rate: 1.08, pitch: 0.02, volume: 1.05, pauseScale: 0.8, emphasisStrength: 0.5, intensity: 0.55, wpm: 165,
    azureStyle: 'newscast-formal',
    openaiInstructions: 'Lee como un presentador de informativos: agil, neutro, preciso y sin dramatismo.',
    elevenlabs: { stability: 0.68, similarity_boost: 0.8, style: 0.15 },
  },
  {
    id: 'energetico',
    label: 'Energetico',
    icon: '⚡',
    description: 'Rapido y con chispa. Ideal para publicidad y redes.',
    rate: 1.16, pitch: 0.14, volume: 1.12, pauseScale: 0.7, emphasisStrength: 0.8, intensity: 0.8, wpm: 175,
    azureStyle: 'excited',
    openaiInstructions: 'Narra con mucha energia y entusiasmo, ritmo rapido y remates marcados.',
    elevenlabs: { stability: 0.35, similarity_boost: 0.7, style: 0.6 },
  },
  {
    id: 'emocional',
    label: 'Emocional',
    icon: '💫',
    description: 'Calido y sensible, con matices y silencios expresivos.',
    rate: 0.92, pitch: -0.04, volume: 0.98, pauseScale: 1.4, emphasisStrength: 0.75, intensity: 0.8, wpm: 135,
    azureStyle: 'empathetic',
    openaiInstructions: 'Narra con emocion contenida y calidez, respirando entre ideas.',
    elevenlabs: { stability: 0.35, similarity_boost: 0.8, style: 0.55 },
  },
  {
    id: 'misterioso',
    label: 'Misterioso',
    icon: '🌑',
    description: 'Grave, lento y en voz baja. Crea intriga.',
    rate: 0.84, pitch: -0.28, volume: 0.88, pauseScale: 1.6, emphasisStrength: 0.7, intensity: 0.7, wpm: 120,
    azureStyle: 'narration-relaxed',
    openaiInstructions: 'Narra en voz baja y grave, muy pausado, creando intriga y suspense.',
    elevenlabs: { stability: 0.55, similarity_boost: 0.85, style: 0.45 },
  },
  {
    id: 'dramatico',
    label: 'Dramatico',
    icon: '🎭',
    description: 'Contrastes fuertes, silencios y frases que golpean.',
    rate: 0.88, pitch: -0.12, volume: 1.05, pauseScale: 1.7, emphasisStrength: 0.95, intensity: 0.9, wpm: 125,
    azureStyle: 'serious',
    openaiInstructions: 'Narra con intensidad dramatica: contrastes de volumen, silencios largos y remates potentes.',
    elevenlabs: { stability: 0.3, similarity_boost: 0.8, style: 0.7 },
  },
  {
    id: 'inspirador',
    label: 'Inspirador',
    icon: '🚀',
    description: 'Cercano y en ascenso, para mensajes que motivan.',
    rate: 0.98, pitch: 0.08, volume: 1.05, pauseScale: 1.2, emphasisStrength: 0.8, intensity: 0.75, wpm: 140,
    azureStyle: 'hopeful',
    openaiInstructions: 'Narra con tono inspirador y esperanzado, creciendo hacia el final de cada idea.',
    elevenlabs: { stability: 0.42, similarity_boost: 0.78, style: 0.5 },
  },
  {
    id: 'profesional',
    label: 'Profesional',
    icon: '💼',
    description: 'Sobrio y fiable. Para empresa, formacion y producto.',
    rate: 1, pitch: -0.02, volume: 1, pauseScale: 1, emphasisStrength: 0.4, intensity: 0.4, wpm: 150,
    azureStyle: 'narration-professional',
    openaiInstructions: 'Narra con tono corporativo sobrio: claro, seguro y sin exageraciones.',
    elevenlabs: { stability: 0.7, similarity_boost: 0.8, style: 0.1 },
  },
  {
    id: 'conversacional',
    label: 'Conversacional',
    icon: '💬',
    description: 'Como si le hablaras a un amigo. Suelto y espontaneo.',
    rate: 1.05, pitch: 0.05, volume: 1, pauseScale: 0.9, emphasisStrength: 0.55, intensity: 0.6, wpm: 160,
    azureStyle: 'chat',
    openaiInstructions: 'Habla de forma espontanea y cercana, como en una conversacion informal.',
    elevenlabs: { stability: 0.45, similarity_boost: 0.72, style: 0.35 },
  },
];

const BY_ID = new Map(NARRATION_STYLES.map((style) => [style.id, style]));

/** Devuelve un estilo por id; si no existe, cae en "natural". */
export function getStyle(id) {
  return BY_ID.get(String(id || '').toLowerCase()) || BY_ID.get('natural');
}

export const STYLE_IDS = NARRATION_STYLES.map((style) => style.id);

/** Version ligera para el frontend (sin detalles internos de proveedores). */
export function publicStyles() {
  return NARRATION_STYLES.map(({ id, label, icon, description }) => ({
    id,
    label,
    icon,
    description,
  }));
}
