/**
 * Sistema de proyectos (requisito 10): listado, apertura, guardado y borrado.
 */

import { $, el, fill } from '../utils/dom.js';
import { relativeDate, number } from '../utils/format.js';
import { api } from '../api.js';
import { state, update, currentProject } from '../state.js';
import { toast, toastError } from './toast.js';
import { openModal, closeModal } from './modal.js';

let onOpenProject = () => {};
let onNewProject = () => {};

/** Refresca la lista lateral. */
export async function loadProjects() {
  try {
    const data = await api.listProjects();
    update({ projects: data.projects || [] });
    renderProjects();
  } catch (error) {
    toastError(error);
  }
}

function renderProjects() {
  const list = $('#projects-list');

  if (!state.projects.length) {
    fill(list, [
      el('li', {}, [
        el('p', {
          class: 'projects__empty',
          text: 'Todavia no has guardado ningun proyecto. Genera una narracion y pulsa "Guardar proyecto".',
        }),
      ]),
    ]);
    return;
  }

  fill(
    list,
    state.projects.map((project) =>
      el('li', {}, [
        el('div', { class: `project${project.id === state.projectId ? ' is-active' : ''}` }, [
          el(
            'button',
            {
              class: 'project__open',
              attrs: { type: 'button', title: 'Abrir proyecto' },
              on: { click: () => openProject(project.id) },
            },
            [
              el('span', { class: 'project__name', text: `📁 ${project.name}` }),
              el('span', {
                class: 'project__meta',
                text: [
                  `${number(project.words)} palabras`,
                  project.estimatedDuration,
                  project.hasAudio ? 'con audio' : 'sin audio',
                  relativeDate(project.updatedAt),
                ].join(' · '),
              }),
              project.preview ? el('span', { class: 'project__preview', text: project.preview }) : null,
            ],
          ),
          el('button', {
            class: 'btn btn--icon btn--danger',
            attrs: { type: 'button', title: 'Eliminar proyecto', 'aria-label': `Eliminar ${project.name}` },
            text: '🗑',
            on: { click: () => removeProject(project) },
          }),
        ]),
      ]),
    ),
  );
}

async function openProject(id) {
  try {
    const { project } = await api.getProject(id);
    onOpenProject(project);
    closeModal('#projects-drawer');
    toast('ok', `Proyecto "${project.name}" abierto.`);
  } catch (error) {
    toastError(error);
  }
}

async function removeProject(project) {
  if (!window.confirm(`Se eliminara el proyecto "${project.name}" y su audio. Continuar?`)) return;
  try {
    await api.deleteProject(project.id);
    if (state.projectId === project.id) update({ projectId: null });
    await loadProjects();
    toast('ok', 'Proyecto eliminado.');
  } catch (error) {
    toastError(error);
  }
}

/** Guarda (crea o actualiza) el proyecto en edicion. */
export async function saveCurrentProject({ silent = false } = {}) {
  if (!state.script.trim()) {
    if (!silent) toast('warn', 'Escribe un guion antes de guardar el proyecto.');
    return null;
  }

  const payload = currentProject();
  const indicator = $('#save-state');
  indicator.textContent = 'Guardando…';

  try {
    const { project } = state.projectId
      ? await api.updateProject(state.projectId, payload)
      : await api.createProject(payload);

    update({ projectId: project.id, dirty: false });
    indicator.textContent = `Guardado ${relativeDate(project.updatedAt)}`;
    await loadProjects();
    if (!silent) toast('ok', `Proyecto "${project.name}" guardado.`);
    return project;
  } catch (error) {
    indicator.textContent = 'No se pudo guardar';
    if (!silent) toastError(error);
    return null;
  }
}

export function initProjects({ onOpen = () => {}, onNew = () => {} } = {}) {
  onOpenProject = onOpen;
  onNewProject = onNew;

  $('#btn-projects').addEventListener('click', () => {
    loadProjects();
    openModal('#projects-drawer');
    $('#btn-projects').setAttribute('aria-expanded', 'true');
  });

  $('#projects-drawer').addEventListener('click', (event) => {
    if (event.target.dataset.closeDrawer !== undefined) {
      $('#btn-projects').setAttribute('aria-expanded', 'false');
    }
  });

  $('#btn-new-project').addEventListener('click', () => {
    if (state.dirty && !window.confirm('Hay cambios sin guardar. Quieres empezar un proyecto nuevo igualmente?')) {
      return;
    }
    onNewProject();
    closeModal('#projects-drawer');
    toast('info', 'Proyecto nuevo listo.');
  });

  $('#btn-save-project').addEventListener('click', () => saveCurrentProject());
}

export { renderProjects };
