/**
 * AI Voice Studio - arranque de la interfaz.
 *
 * Orquesta los modulos de interfaz y define el recorrido del requisito 18:
 *
 *   PEGAR GUION -> ELEGIR VOZ -> ELEGIR ESTILO -> AJUSTAR -> ANALIZAR
 *   -> GENERAR -> ESCUCHAR -> DESCARGAR
 */

import { $ } from './utils/dom.js';
import { relativeDate } from './utils/format.js';
import { api } from './api.js';
import { state, update, loadPreferences, savePreferences } from './state.js';
import { toast, toastError } from './ui/toast.js';
import { initTheme } from './ui/theme.js';
import { initModals } from './ui/modal.js';
import { initEditor, setScript, recomputeStats } from './ui/editor.js';
import { initSettings, loadVoices, updateShorts, renderStyles, renderSliders } from './ui/settings.js';
import { initResults, generateNarration, restoreAudio, clearResults } from './ui/results.js';
import { initOptimizer } from './ui/optimizer.js';
import { initProjects, loadProjects } from './ui/projects.js';

/** Etiqueta del proveedor activo en la barra superior. */
function renderProviderBadge() {
  const badge = $('#provider-badge');
  const tts = state.config?.tts;
  if (!tts) return;

  const names = {
    mock: 'Voz de demostracion',
    elevenlabs: 'ElevenLabs',
    openai: 'OpenAI',
    google: 'Google Cloud',
    azure: 'Azure Speech',
  };

  const isDemo = tts.effective === 'mock';
  const label = names[tts.effective] || tts.effective;
  const title = isDemo
    ? 'Motor de demostracion sin conexion: reproduce el ritmo real, pero no es una voz humana. Configura un proveedor en el archivo .env.'
    : `Motor de voz activo: ${label}`;

  for (const node of [badge, $('#provider-badge-panel')]) {
    if (!node) continue;
    node.textContent = label;
    node.className = `badge ${isDemo ? 'badge--warn' : 'badge--ok'}`;
    node.title = title;
  }
}

/** Deja el formato de descarga que el servidor puede entregar. */
function applyFormatAvailability() {
  const wavButton = document.querySelector('.player__download [data-format="wav"]');
  if (!wavButton) return;
  const supported = state.config?.tts?.downloadFormats?.wav !== false;
  wavButton.disabled = !supported;
  wavButton.title = supported
    ? 'Descargar en WAV sin comprimir'
    : 'El servidor no puede entregar WAV con la configuracion actual. Instala ffmpeg para habilitarlo.';
}

/** Carga un proyecto guardado en la interfaz. */
function openProject(project) {
  update({
    projectId: project.id,
    projectName: project.name,
    styleId: project.styleId || 'natural',
    voiceId: project.voiceId || state.voiceId,
    controls: { ...state.controls, ...(project.controls || {}) },
    autoInterpret: project.autoInterpret !== false,
    analysis: null,
    plan: null,
  });

  $('#project-name').value = project.name;
  $('#auto-interpret').checked = state.autoInterpret;
  $('#save-state').textContent = `Guardado ${relativeDate(project.updatedAt)}`;

  renderStyles();
  renderSliders();
  setScript(project.script || '', { markDirty: false });
  restoreAudio(project.audio);
  loadProjects();
}

/** Empieza un proyecto en blanco. */
function newProject() {
  update({ projectId: null, projectName: 'Narracion sin titulo', analysis: null, plan: null });
  $('#project-name').value = state.projectName;
  $('#save-state').textContent = '';
  setScript('', { markDirty: false });
  clearResults();
}

/** Al cambiar el guion o los ajustes, los resultados anteriores caducan. */
function onContentChange() {
  update({ analysis: null, plan: null });
  $('#analysis-card').hidden = true;
  recomputeStats();
  updateShorts();
}

async function bootstrap() {
  initTheme();
  initModals();
  loadPreferences();

  try {
    const config = await api.config();
    update({
      config,
      controls: { ...(config.controls?.defaults || {}), ...state.controls },
    });
  } catch (error) {
    toastError(error);
    toast('error', 'No se pudo cargar la configuracion. Recarga la pagina cuando el servidor este disponible.');
    return;
  }

  renderProviderBadge();
  applyFormatAvailability();

  initEditor({ onChange: onContentChange });
  initSettings({ onChange: onContentChange });
  initResults();
  initOptimizer({ onApply: (text) => setScript(text) });
  initProjects({ onOpen: openProject, onNew: newProject });

  await loadVoices();
  await loadProjects();

  // Nombre del proyecto.
  const nameInput = $('#project-name');
  nameInput.value = state.projectName;
  nameInput.addEventListener('input', () => {
    update({ projectName: nameInput.value.trim() || 'Narracion sin titulo', dirty: true });
  });

  $('#btn-generate').addEventListener('click', generateNarration);

  // Aviso al cerrar con cambios sin guardar.
  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty || !state.script.trim()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  // Guion de ejemplo la primera vez, para que se pueda probar sin escribir nada.
  const seen = (() => {
    try {
      return localStorage.getItem('ai-voice-studio:seen') === '1';
    } catch {
      return true;
    }
  })();

  if (!seen) {
    setScript(
      [
        'Colombia guarda una historia que pocos conocen.',
        '',
        '[PAUSA] Pero entonces ocurrio algo inesperado.',
        'En una sola noche, el 90% de los archivos desaparecio.',
        '',
        '[EMOCION: TRISTE] Durante anos, nadie hablo de aquello.',
        '[TONO: MISTERIOSO] Hasta que una carta cambio todo lo que creiamos saber.',
      ].join('\n'),
      { markDirty: false },
    );
    try {
      localStorage.setItem('ai-voice-studio:seen', '1');
    } catch {
      // Sin almacenamiento el ejemplo se mostrara en cada visita.
    }
    toast('info', 'Te dejamos un guion de ejemplo con marcadores. Pulsa "Generar narracion" para escucharlo.', {
      title: 'Bienvenido a AI Voice Studio',
      timeout: 9000,
    });
  }

  if (state.config?.offlineMode) {
    toast(
      'warn',
      'Estas usando el motor de voz de demostracion: sirve para probar el flujo completo, pero no es una voz humana. Configura un proveedor en el archivo .env.',
      { title: 'Modo demostracion', timeout: 10000 },
    );
  }

  savePreferences();
}

bootstrap().catch((error) => {
  console.error(error);
  toast('error', 'No se pudo iniciar la aplicacion. Recarga la pagina.');
});
