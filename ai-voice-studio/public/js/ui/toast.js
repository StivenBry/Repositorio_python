/**
 * Avisos flotantes. Es el unico canal por el que la aplicacion comunica
 * errores al usuario, siempre con lenguaje claro (requisito 16).
 */

import { $, el } from '../utils/dom.js';

const ICONS = { ok: '✅', error: '⚠️', warn: '💡', info: 'ℹ️' };
const TITLES = { ok: 'Listo', error: 'Algo no ha ido bien', warn: 'Atencion', info: 'Informacion' };

let container = null;

function host() {
  if (!container) container = $('#toasts');
  return container;
}

/**
 * @param {'ok'|'error'|'warn'|'info'} type
 * @param {string} text
 * @param {object} [options] { title, timeout }
 */
export function toast(type, text, { title, timeout = type === 'error' ? 8000 : 4500 } = {}) {
  const node = el('div', { class: `toast toast--${type}` }, [
    el('span', { class: 'toast__icon', text: ICONS[type] || ICONS.info }),
    el('div', { class: 'toast__body' }, [
      el('div', { class: 'toast__title', text: title || TITLES[type] || TITLES.info }),
      el('div', { class: 'toast__text', text }),
    ]),
  ]);

  host().append(node);

  const remove = () => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 220);
  };
  node.addEventListener('click', remove);
  setTimeout(remove, timeout);

  return remove;
}

/** Muestra un error de la API con su mensaje y su sugerencia. */
export function toastError(error) {
  const message = error?.message || 'Ocurrio un error inesperado.';
  const hint = error?.hint ? ` ${error.hint}` : '';
  toast('error', `${message}${hint}`);
}
