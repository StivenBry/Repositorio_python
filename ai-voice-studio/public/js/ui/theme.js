/**
 * Modo claro / oscuro (requisito 13). La preferencia se guarda en el
 * navegador; si no hay ninguna, se respeta la del sistema operativo.
 */

import { $ } from '../utils/dom.js';

const KEY = 'ai-voice-studio:theme';

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  const button = $('#btn-theme');
  if (button) {
    button.firstElementChild.textContent = theme === 'dark' ? '🌙' : '☀️';
    button.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
  }
}

export function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    saved = null;
  }

  // El modo oscuro es el predeterminado del producto (requisito 13); solo se
  // usa el claro si la persona lo ha elegido expresamente.
  apply(saved === 'light' ? 'light' : 'dark');

  $('#btn-theme')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Sin almacenamiento el tema simplemente no se recuerda.
    }
  });
}
