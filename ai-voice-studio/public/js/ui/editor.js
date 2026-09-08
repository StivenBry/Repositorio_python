/**
 * Panel del guion: editor, estadisticas en vivo, limpieza y ayuda de
 * marcadores (requisitos 1, 6 y 12).
 */

import { $, el, fill, debounce } from '../utils/dom.js';
import { number } from '../utils/format.js';
import { api } from '../api.js';
import { state, update, currentSettings } from '../state.js';
import { toast } from './toast.js';
import { openModal, closeModal } from './modal.js';

let statsController = null;
let onScriptChange = () => {};

/** Pide las estadisticas al servidor cancelando la peticion anterior. */
const refreshStats = debounce(async () => {
  statsController?.abort();
  statsController = new AbortController();

  if (!state.script.trim()) {
    renderStats(null);
    return;
  }

  try {
    const { stats } = await api.stats(
      { script: state.script, ...currentSettings() },
      statsController.signal,
    );
    update({ stats });
    renderStats(stats);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    // Las estadisticas son informativas: si fallan no se interrumpe al usuario.
    renderStats(null);
  }
}, 350);

/** Pinta las seis estadisticas del requisito 12. */
function renderStats(stats) {
  const values = {
    'stat-words': number(stats?.words || 0),
    'stat-chars': number(stats?.characters || 0),
    'stat-duration': stats ? stats.estimatedDuration : '0 s',
    'stat-paragraphs': number(stats?.paragraphs || 0),
    'stat-sentences': number(stats?.sentences || 0),
    'stat-wpm': number(stats?.wordsPerMinute || 0),
  };
  for (const [id, value] of Object.entries(values)) {
    const node = $(`#${id}`);
    if (node) node.textContent = value;
  }

  const warning = $('#editor-warning');
  if (stats?.unknownMarkers > 0) {
    warning.textContent =
      `Hay ${stats.unknownMarkers} texto(s) entre corchetes que no son marcadores conocidos. ` +
      'Se leeran en voz alta tal cual: revisa que no sean una errata.';
    warning.hidden = false;
  } else {
    warning.hidden = true;
  }
}

/** Actualiza el contador de caracteres y el estado del boton de generar. */
function renderCounter() {
  const max = state.config?.limits?.maxScriptChars || 8000;
  const used = state.script.length;
  const counter = $('#chars-used');
  const limit = $('.editor__limit');

  counter.textContent = number(used);
  $('#chars-max').textContent = number(max);
  limit.classList.toggle('is-over', used > max);

  const empty = !state.script.trim();
  $('#btn-generate').disabled = empty || used > max;
  $('#btn-optimize').disabled = empty || used > max;
}

/** Escribe texto en la posicion del cursor sin perder el resto del guion. */
function insertAtCursor(text) {
  const editor = $('#editor');
  const start = editor.selectionStart ?? editor.value.length;
  const end = editor.selectionEnd ?? editor.value.length;

  editor.setRangeText(text, start, end, 'end');
  editor.focus();
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Ventana con la referencia de marcadores (requisito 6). */
function renderMarkersHelp() {
  const list = $('#markers-list');
  const markers = state.config?.markers || [];

  fill(
    list,
    markers.map((marker) =>
      el('li', {}, [
        el(
          'button',
          {
            class: 'marker',
            attrs: { type: 'button' },
            on: {
              click: () => {
                insertAtCursor(` ${marker.syntax.split('...')[0]} `);
                closeModal('#markers-modal');
                toast('info', `Marcador ${marker.syntax} insertado en el guion.`);
              },
            },
          },
          [el('code', { text: marker.syntax }), el('span', { text: marker.description })],
        ),
      ]),
    ),
  );
}

/** Cambia el contenido del editor desde fuera (proyectos, optimizador). */
export function setScript(text, { markDirty = true } = {}) {
  $('#editor').value = text ?? '';
  update({ script: text ?? '', dirty: markDirty });
  renderCounter();
  refreshStats();
  onScriptChange();
}

/** Fuerza un recalculo (por ejemplo al cambiar el estilo o la velocidad). */
export function recomputeStats() {
  refreshStats();
}

export function initEditor({ onChange = () => {} } = {}) {
  onScriptChange = onChange;
  const editor = $('#editor');

  editor.addEventListener('input', () => {
    update({ script: editor.value, dirty: true });
    renderCounter();
    refreshStats();
    onChange();
  });

  // Ctrl/Cmd + Enter genera la narracion sin soltar el teclado.
  editor.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      $('#btn-generate').click();
    }
  });

  $('#btn-clear').addEventListener('click', () => {
    if (!state.script.trim()) return;
    if (!window.confirm('Se borrara todo el guion. Esta accion no se puede deshacer. Continuar?')) return;
    setScript('');
    update({ analysis: null, plan: null, audio: null, shorts: null });
    toast('info', 'Guion vaciado.');
    editor.focus();
  });

  $('#btn-markers').addEventListener('click', () => {
    renderMarkersHelp();
    openModal('#markers-modal');
  });

  renderCounter();
  renderStats(null);
}
