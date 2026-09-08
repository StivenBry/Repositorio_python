/**
 * Ventanas modales y cajones laterales: apertura, cierre y foco.
 */

import { $, $$, onEscape } from '../utils/dom.js';

const openStack = [];
let unbindEscape = null;

function lock() {
  document.body.style.overflow = 'hidden';
}

function unlock() {
  if (!openStack.length) document.body.style.overflow = '';
}

export function openModal(selector) {
  const node = $(selector);
  if (!node || !node.hidden) return;

  node.hidden = false;
  openStack.push(selector);
  lock();

  // El primer control interactivo recibe el foco (accesibilidad).
  const focusable = node.querySelector('button, [href], input, select, textarea');
  focusable?.focus({ preventScroll: true });

  if (!unbindEscape) {
    unbindEscape = onEscape(() => closeModal(openStack[openStack.length - 1]));
  }
}

export function closeModal(selector) {
  const node = $(selector);
  if (!node || node.hidden) return;

  node.hidden = true;
  const index = openStack.lastIndexOf(selector);
  if (index >= 0) openStack.splice(index, 1);

  if (!openStack.length && unbindEscape) {
    unbindEscape();
    unbindEscape = null;
  }
  unlock();
}

/** Conecta los botones y fondos marcados con data-close-modal / data-close-drawer. */
export function initModals() {
  for (const node of $$('.modal, .drawer')) {
    const selector = `#${node.id}`;
    for (const closer of $$('[data-close-modal], [data-close-drawer]', node)) {
      closer.addEventListener('click', () => closeModal(selector));
    }
  }
}
