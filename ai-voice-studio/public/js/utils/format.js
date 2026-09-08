/**
 * Formatos de presentacion en castellano.
 */

const NUMBER = new Intl.NumberFormat('es');

export const number = (value) => NUMBER.format(Math.round(Number(value) || 0));

/** Segundos -> "1:24" para el reproductor. */
export function clock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Segundos -> "1 min 24 s" para las estadisticas. */
export function duration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** Bytes -> "3,2 MB". */
export function bytes(value) {
  const size = Number(value) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Fecha ISO -> "hace 5 minutos" / "12 mar 2026". */
export function relativeDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Nombres legibles de los tipos de frase y de las emociones. */
export const KIND_LABELS = {
  statement: 'Afirmacion',
  question: 'Pregunta',
  exclamation: 'Exclamacion',
  dialogue: 'Dialogo',
  heading: 'Titulo',
  'list-item': 'Enumeracion',
};

export const EMOTION_LABELS = {
  neutral: 'Neutral',
  joy: 'Alegria',
  sadness: 'Tristeza',
  anger: 'Enfado',
  tension: 'Tension',
  awe: 'Asombro',
  calm: 'Calma',
  urgency: 'Urgencia',
  hope: 'Esperanza',
};

export const REASON_LABELS = {
  question: 'Pregunta',
  exclamation: 'Exclamacion',
  heading: 'Titulo',
  dialogue: 'Dialogo',
  'list-item': 'Enumeracion',
  'cambio-de-tema': 'Cambio de tema',
  'escena-start': 'Inicio de escena',
  'escena-end': 'Final de escena',
  'enfasis-marcado': 'Enfasis marcado',
  'pausa-marcada': 'Pausa marcada',
  'pausa-previa': 'Pausa antes del giro',
};

/** Nombre de archivo a partir del titulo del proyecto. */
export function slugify(value, fallback = 'narracion') {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}
