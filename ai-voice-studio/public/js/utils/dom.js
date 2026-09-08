/**
 * Ayudantes minimos para trabajar con el DOM.
 *
 * Todo el contenido dinamico se inserta con `textContent`, nunca con
 * `innerHTML`, para que un guion pegado por el usuario no pueda ejecutar
 * codigo en la pagina (requisito 17).
 */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/**
 * Crea un elemento.
 * @param {string} tag
 * @param {object} [props] class, text, attrs, dataset, on
 * @param {Array} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  if (props.class) node.className = props.class;
  if (props.text !== undefined) node.textContent = String(props.text);
  if (props.html !== undefined) node.innerHTML = props.html; // Solo para iconos internos.

  for (const [key, value] of Object.entries(props.attrs || {})) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const [key, value] of Object.entries(props.dataset || {})) {
    node.dataset[key] = String(value);
  }
  for (const [event, handler] of Object.entries(props.on || {})) {
    node.addEventListener(event, handler);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

/** Vacia un contenedor y le anade los hijos indicados. */
export function fill(container, children) {
  container.replaceChildren(...[].concat(children).filter(Boolean));
  return container;
}

/** Ejecuta una funcion como maximo cada `wait` milisegundos de inactividad. */
export function debounce(fn, wait = 300) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Activa o desactiva el estado de carga de un boton. */
export function setLoading(button, loading) {
  if (!button) return;
  button.classList.toggle('is-loading', Boolean(loading));
  button.disabled = Boolean(loading);
}

/** Cierra una ventana modal o un cajon con la tecla Escape. */
export function onEscape(handler) {
  const listener = (event) => {
    if (event.key === 'Escape') handler(event);
  };
  document.addEventListener('keydown', listener);
  return () => document.removeEventListener('keydown', listener);
}
