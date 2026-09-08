/**
 * Lexicos del analizador heuristico.
 *
 * Todas las entradas estan en minusculas y SIN TILDES, porque se comparan
 * contra el texto normalizado con `deburr()`. Asi "emocion" casa con
 * "emocion" y con "emoción", y "cambio" con "cambió".
 *
 * Cubren castellano e ingles: son los dos idiomas mas frecuentes en guiones
 * de video, y anadir otro es solo ampliar estas listas.
 */

/** Conectores que anuncian un giro, una revelacion o un cambio de tema. */
export const TOPIC_SHIFT = [
  'pero', 'sin embargo', 'no obstante', 'en cambio', 'por el contrario',
  'aunque', 'a pesar de', 'mientras tanto', 'entretanto', 'de repente',
  'de pronto', 'de golpe', 'entonces', 'asi que', 'por eso', 'por tanto',
  'por lo tanto', 'en consecuencia', 'ademas', 'es decir', 'en otras palabras',
  'por otro lado', 'por ultimo', 'finalmente', 'para terminar', 'en conclusion',
  'en resumen', 'primero', 'segundo', 'despues', 'anos despues', 'hoy',
  'actualmente', 'hasta que', 'de hecho', 'lo cierto es que', 'ahora bien',
  'but', 'however', 'meanwhile', 'suddenly', 'then', 'therefore', 'finally',
  'in conclusion', 'on the other hand', 'in fact', 'years later',
];

/** Palabras que suelen marcar el momento clave de un guion. */
export const REVEAL = [
  'inesperado', 'inesperada', 'sorprendente', 'sorpresa', 'increible',
  'jamas', 'nunca', 'siempre', 'secreto', 'secretos', 'misterio', 'oculto',
  'descubrio', 'descubrieron', 'descubrimiento', 'revelo', 'revelaron',
  'cambio', 'cambiaria', 'transformo', 'primera', 'primer', 'ultimo',
  'ultima', 'unico', 'unica', 'nadie', 'todo', 'nada', 'clave', 'error',
  'problema', 'peligro', 'verdad', 'realidad', 'imposible', 'historico',
  'unexpected', 'surprising', 'incredible', 'never', 'secret', 'discovered',
  'changed', 'nobody', 'everything', 'truth', 'impossible',
];

/** Lexicos emocionales: palabra -> familia emocional. */
export const EMOTION_LEXICON = {
  joy: [
    'feliz', 'felicidad', 'alegre', 'alegria', 'celebrar', 'celebracion',
    'exito', 'triunfo', 'sonrisa', 'maravilloso', 'maravillosa', 'fantastico',
    'genial', 'logro', 'victoria', 'amor', 'disfrutar', 'encanta', 'divertido',
    'happy', 'joy', 'success', 'wonderful', 'amazing', 'love', 'fun',
  ],
  sadness: [
    'triste', 'tristeza', 'dolor', 'perdida', 'murio', 'muerte', 'muerto',
    'llorar', 'lagrimas', 'soledad', 'solo', 'fracaso', 'adios', 'nostalgia',
    'sufrimiento', 'sufrio', 'tragedia', 'abandono', 'olvido', 'duelo',
    'sad', 'sadness', 'pain', 'loss', 'died', 'death', 'lonely', 'failure',
  ],
  anger: [
    'injusticia', 'injusto', 'rabia', 'furia', 'furioso', 'indignante',
    'indignacion', 'harto', 'culpa', 'traicion', 'traiciono', 'corrupcion',
    'abuso', 'mentira', 'mentiras', 'enfado', 'protesta',
    'anger', 'angry', 'unfair', 'betrayal', 'lie', 'corruption',
  ],
  tension: [
    'peligro', 'peligroso', 'miedo', 'temor', 'oscuridad', 'oscuro',
    'amenaza', 'riesgo', 'crisis', 'alarma', 'sombra', 'sombras', 'silencio',
    'desaparecio', 'extrano', 'extrana', 'inquietante', 'trampa', 'ataque',
    'guerra', 'batalla', 'noche', 'tormenta', 'grito',
    'danger', 'fear', 'threat', 'risk', 'crisis', 'shadow', 'strange', 'war',
  ],
  awe: [
    'increible', 'asombroso', 'asombrosa', 'gigantesco', 'inmenso', 'universo',
    'cosmos', 'galaxia', 'descubrimiento', 'milagro', 'magnifico', 'colosal',
    'impresionante', 'espectacular', 'majestuoso', 'infinito', 'eternidad',
    'awe', 'immense', 'universe', 'galaxy', 'miracle', 'spectacular',
  ],
  calm: [
    'calma', 'calmado', 'tranquilo', 'tranquila', 'sereno', 'serena', 'suave',
    'respirar', 'respiracion', 'paz', 'descanso', 'silencioso', 'lento',
    'armonia', 'equilibrio', 'bienestar',
    'calm', 'quiet', 'peace', 'rest', 'balance', 'breathe',
  ],
  urgency: [
    'ahora', 'ya', 'rapido', 'corre', 'urgente', 'urgencia', 'atencion',
    'cuidado', 'inmediato', 'inmediatamente', 'deprisa', 'ultimo', 'ultimos',
    'antes', 'apurate', 'no esperes',
    'now', 'hurry', 'urgent', 'immediately', 'warning', 'quick',
  ],
  hope: [
    'futuro', 'sueno', 'suenos', 'lograr', 'lograras', 'puedes', 'podemos',
    'juntos', 'cambiar', 'mejor', 'oportunidad', 'inspirar', 'inspiracion',
    'comenzar', 'empezar', 'crecer', 'construir', 'esperanza', 'creer',
    'future', 'dream', 'together', 'change', 'better', 'opportunity', 'hope',
  ],
};

/** Abreviaturas que conviene expandir para que el TTS las lea bien. */
export const TTS_EXPANSIONS = [
  { pattern: /\bDr\.(?=\s)/g, replacement: 'Doctor', label: 'Dr. -> Doctor' },
  { pattern: /\bDra\.(?=\s)/g, replacement: 'Doctora', label: 'Dra. -> Doctora' },
  { pattern: /\bSr\.(?=\s)/g, replacement: 'Senor', label: 'Sr. -> Senor' },
  { pattern: /\bSra\.(?=\s)/g, replacement: 'Senora', label: 'Sra. -> Senora' },
  { pattern: /\bIng\.(?=\s)/g, replacement: 'Ingeniero', label: 'Ing. -> Ingeniero' },
  { pattern: /\betc\./g, replacement: 'etcetera', label: 'etc. -> etcetera' },
  { pattern: /\bp\.\s?ej\./gi, replacement: 'por ejemplo', label: 'p. ej. -> por ejemplo' },
  { pattern: /\bEE\.\s?UU\./g, replacement: 'Estados Unidos', label: 'EE. UU. -> Estados Unidos' },
  { pattern: /\bapprox\.|\baprox\./gi, replacement: 'aproximadamente', label: 'aprox. -> aproximadamente' },
  { pattern: /(\d)\s?%/g, replacement: '$1 por ciento', label: '% -> por ciento' },
  { pattern: /(\d)\s?km\b/g, replacement: '$1 kilometros', label: 'km -> kilometros' },
  { pattern: /(\d)\s?kg\b/g, replacement: '$1 kilogramos', label: 'kg -> kilogramos' },
  { pattern: /\s&\s/g, replacement: ' y ', label: '& -> y' },
];

/** Palabras vacias que no cuentan como repeticion. */
export const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'a', 'ante', 'con', 'en', 'para', 'por', 'sin', 'sobre', 'tras', 'y', 'e',
  'o', 'u', 'que', 'se', 'su', 'sus', 'lo', 'le', 'les', 'mi', 'tu', 'es',
  'son', 'fue', 'era', 'ser', 'estar', 'esta', 'este', 'esto', 'esa', 'ese',
  'como', 'mas', 'pero', 'si', 'no', 'ya', 'muy', 'tambien', 'donde', 'cuando',
  'the', 'a', 'an', 'of', 'to', 'and', 'or', 'in', 'on', 'for', 'with', 'is',
  'are', 'was', 'were', 'be', 'this', 'that', 'it', 'as', 'at', 'by', 'from',
]);

/** Palabras frecuentes usadas para detectar el idioma del guion. */
export const LANGUAGE_HINTS = {
  es: ['el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'un', 'una', 'por', 'con', 'para', 'pero', 'como', 'este', 'esta', 'muy', 'porque', 'cuando'],
  en: ['the', 'and', 'of', 'to', 'in', 'that', 'is', 'was', 'for', 'with', 'this', 'but', 'they', 'have', 'from', 'were', 'been', 'their', 'about', 'because'],
};

/** Factores de interpretacion asociados a cada familia emocional. */
export const EMOTION_PROSODY = {
  neutral: { rateFactor: 1, pitchFactor: 0, emphasis: 0, pauseBefore: 0 },
  joy: { rateFactor: 1.06, pitchFactor: 0.1, emphasis: 0.25, pauseBefore: 0 },
  sadness: { rateFactor: 0.9, pitchFactor: -0.1, emphasis: 0.1, pauseBefore: 180 },
  anger: { rateFactor: 1.05, pitchFactor: 0.05, emphasis: 0.4, pauseBefore: 80 },
  tension: { rateFactor: 0.89, pitchFactor: -0.14, emphasis: 0.35, pauseBefore: 240 },
  awe: { rateFactor: 0.93, pitchFactor: -0.04, emphasis: 0.3, pauseBefore: 160 },
  calm: { rateFactor: 0.94, pitchFactor: -0.03, emphasis: 0.05, pauseBefore: 120 },
  urgency: { rateFactor: 1.14, pitchFactor: 0.08, emphasis: 0.45, pauseBefore: 0 },
  hope: { rateFactor: 1, pitchFactor: 0.07, emphasis: 0.3, pauseBefore: 100 },
};
