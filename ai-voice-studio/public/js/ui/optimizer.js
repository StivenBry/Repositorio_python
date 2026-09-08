/**
 * Optimizador de guiones (requisito 7).
 *
 * Regla del proyecto: el guion original NUNCA se sustituye automaticamente.
 * Se muestran las dos versiones y la lista de mejoras, y solo se aplica si el
 * usuario pulsa "Aplicar cambios".
 */

import { $, el, fill, setLoading } from '../utils/dom.js';
import { number } from '../utils/format.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { toast, toastError } from './toast.js';
import { openModal, closeModal } from './modal.js';

const CHANGE_ICONS = {
  puntuacion: '📐',
  pausa: '⏸️',
  enfasis: '💥',
  'frase-larga': '✂️',
  pronunciacion: '🗣️',
  ritmo: '🎵',
  introduccion: '🎬',
  repeticion: '🔁',
  sugerencia: '💡',
  aviso: '⚠️',
};

let proposal = null;
let applyScript = () => {};

function metaLine(stats) {
  if (!stats) return '';
  return `${number(stats.words)} palabras · ${number(stats.sentences)} frases · ${stats.estimatedDuration}`;
}

function renderProposal(data) {
  $('#diff-original').textContent = data.original;
  $('#diff-optimized').textContent = data.optimized;
  $('#diff-meta-original').textContent = metaLine(data.statsOriginal);
  $('#diff-meta-optimized').textContent = metaLine(data.statsOptimized);

  const blocks = [
    ...data.changes.map((change) => ({ ...change, applied: true })),
    ...data.notes.map((note) => ({ ...note, applied: false })),
  ];

  fill(
    $('#optimizer-changes'),
    blocks.length
      ? blocks.map((item) =>
          el('div', { class: `change${item.applied ? '' : ' change--note'}` }, [
            el('span', { class: 'change__icon', text: CHANGE_ICONS[item.type] || '•' }),
            el('div', {}, [
              el('div', { class: 'change__title', text: item.applied ? item.title : `Sugerencia: ${item.title}` }),
              el('div', { class: 'change__detail', text: item.detail }),
            ]),
          ]),
        )
      : [el('p', { class: 'inline-note', text: 'El guion ya estaba bien preparado para locucion: no hizo falta cambiar nada.' })],
  );

  $('#btn-accept').disabled = !data.changed;
}

/** Pide la propuesta al servidor y abre la ventana de comparacion. */
export async function optimizeScript() {
  const button = $('#btn-optimize');
  if (!state.script.trim()) {
    toast('warn', 'Escribe o pega un guion antes de optimizarlo.');
    return;
  }

  setLoading(button, true);
  try {
    const data = await api.optimize({
      script: state.script,
      styleId: state.styleId,
      controls: state.controls,
    });

    proposal = data;
    renderProposal(data);
    openModal('#optimizer-modal');

    if (data.degraded) toast('warn', data.degradedReason);
    if (!data.changed) toast('info', 'No se han encontrado cambios necesarios en el guion.');
  } catch (error) {
    toastError(error);
  } finally {
    setLoading(button, false);
  }
}

export function initOptimizer({ onApply = () => {} } = {}) {
  applyScript = onApply;

  $('#btn-optimize').addEventListener('click', optimizeScript);

  $('#btn-accept').addEventListener('click', () => {
    if (!proposal) return;
    applyScript(proposal.optimized);
    closeModal('#optimizer-modal');
    toast('ok', 'Guion optimizado aplicado. Puedes deshacerlo pulsando Ctrl+Z en el editor.');
  });

  $('#btn-reject').addEventListener('click', () => {
    toast('info', 'Se mantiene tu guion original.');
  });
}
