/**
 * Estado de la aplicacion.
 *
 * Un almacen minimo con suscripciones: cada modulo de interfaz se suscribe a
 * los cambios que le interesan y se vuelve a dibujar solo cuando hacen falta.
 * Evita depender de un framework y mantiene el flujo de datos en un sitio.
 */

const listeners = new Set();

export const state = {
  /** Configuracion publica que envia el servidor. */
  config: null,

  /** Proyecto en edicion. */
  projectId: null,
  projectName: 'Narracion sin titulo',
  script: '',
  dirty: false,

  /** Ajustes de narracion. */
  styleId: 'natural',
  autoInterpret: true,
  voiceId: '',
  voices: [],
  genderFilter: 'all',
  controls: { speed: 1, pitch: 0, volume: 1, intensity: 0.5, pauses: 1 },
  downloadFormat: 'mp3',

  /** Resultados. */
  stats: null,
  analysis: null,
  plan: null,
  audio: null,
  shortsMode: false,
  shorts: null,

  /** Proyectos guardados. */
  projects: [],
};

/** Suscribe una funcion a los cambios de estado. Devuelve la baja. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aplica cambios y avisa a los suscriptores con las claves modificadas. */
export function update(patch) {
  const changed = [];
  for (const [key, value] of Object.entries(patch)) {
    if (state[key] === value) continue;
    state[key] = value;
    changed.push(key);
  }
  if (changed.length) {
    for (const listener of listeners) listener(changed, state);
  }
  return state;
}

/** Ajustes que acompanan a casi todas las peticiones. */
export function currentSettings() {
  return {
    styleId: state.styleId,
    controls: state.controls,
    autoInterpret: state.autoInterpret,
    voiceId: state.voiceId,
    format: state.downloadFormat,
  };
}

/** Datos del proyecto en edicion, listos para guardar. */
export function currentProject() {
  const voice = state.voices.find((item) => item.id === state.voiceId);
  return {
    name: state.projectName,
    script: state.script,
    ...currentSettings(),
    voiceName: voice?.name || '',
    provider: state.config?.tts?.effective || '',
    audio: state.audio
      ? {
          id: state.audio.id,
          format: state.audio.format,
          bytes: state.audio.bytes,
          durationSeconds: state.audio.durationSeconds,
        }
      : null,
  };
}

/* --- Preferencias que sobreviven al recargar la pagina ------------------ */
const STORAGE_KEY = 'ai-voice-studio:prefs';

export function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.styleId) state.styleId = saved.styleId;
    if (saved.voiceId) state.voiceId = saved.voiceId;
    if (saved.controls) state.controls = { ...state.controls, ...saved.controls };
    if (typeof saved.autoInterpret === 'boolean') state.autoInterpret = saved.autoInterpret;
    if (saved.downloadFormat) state.downloadFormat = saved.downloadFormat;
    if (saved.genderFilter) state.genderFilter = saved.genderFilter;
  } catch {
    // Si el navegador bloquea el almacenamiento se usan los valores por defecto.
  }
}

export function savePreferences() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        styleId: state.styleId,
        voiceId: state.voiceId,
        controls: state.controls,
        autoInterpret: state.autoInterpret,
        downloadFormat: state.downloadFormat,
        genderFilter: state.genderFilter,
      }),
    );
  } catch {
    // Sin almacenamiento local la aplicacion sigue funcionando igual.
  }
}
