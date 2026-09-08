/**
 * Panel de configuracion: voz, estilo, controles y modo Shorts
 * (requisitos 2, 3, 4 y 11).
 */

import { $, $$, el, fill, debounce, setLoading } from '../utils/dom.js';
import { api } from '../api.js';
import { state, update, currentSettings, savePreferences } from '../state.js';
import { toast, toastError } from './toast.js';

/** Etiquetas y formato de cada control deslizante. */
const SLIDERS = [
  { key: 'speed', label: 'Velocidad', format: (v) => `${v.toFixed(2)}x` },
  { key: 'pitch', label: 'Tono', format: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)} %` },
  { key: 'volume', label: 'Volumen', format: (v) => `${Math.round(v * 100)} %` },
  { key: 'intensity', label: 'Intensidad', format: (v) => `${Math.round(v * 100)} %` },
  { key: 'pauses', label: 'Pausas', format: (v) => `${v.toFixed(2)}x` },
];

let onSettingsChange = () => {};

/* ======================= VOCES (requisito 2) ======================= */

function filteredVoices() {
  if (state.genderFilter === 'all') return state.voices;
  return state.voices.filter((voice) => voice.gender === state.genderFilter);
}

function renderVoiceOptions() {
  const select = $('#voice');
  const voices = filteredVoices();

  if (!voices.length) {
    fill(select, [el('option', { text: 'No hay voces disponibles', attrs: { value: '' } })]);
    select.disabled = true;
    renderVoiceCard(null);
    return;
  }

  select.disabled = false;
  fill(
    select,
    voices.map((voice) =>
      el('option', {
        text: `${voice.name} — ${voice.languageLabel}`,
        attrs: { value: voice.id, selected: voice.id === state.voiceId },
      }),
    ),
  );

  // Si la voz elegida no esta en el filtro actual, se toma la primera.
  if (!voices.some((voice) => voice.id === state.voiceId)) {
    update({ voiceId: voices[0].id });
    select.value = voices[0].id;
    savePreferences();
  }

  renderVoiceCard(state.voices.find((voice) => voice.id === state.voiceId) || null);
}

/** Ficha con nombre, idioma, acento y caracteristicas de la voz. */
function renderVoiceCard(voice) {
  const card = $('#voice-card');
  if (!voice) {
    fill(card, [el('p', { class: 'voice-card__empty', text: 'Selecciona una voz para ver sus caracteristicas.' })]);
    return;
  }

  const genderLabel = { female: 'Femenina', male: 'Masculina', neutral: 'Neutra' }[voice.gender] || 'Neutra';

  fill(card, [
    el('div', { class: 'voice-card__name', text: voice.name }),
    el('div', { class: 'voice-card__grid' }, [
      el('span', { class: 'voice-card__key', text: 'Tipo' }),
      el('span', { class: 'voice-card__value', text: genderLabel }),
      el('span', { class: 'voice-card__key', text: 'Idioma' }),
      el('span', { class: 'voice-card__value', text: voice.languageLabel }),
      el('span', { class: 'voice-card__key', text: 'Acento' }),
      el('span', { class: 'voice-card__value', text: voice.accent || '—' }),
    ]),
    el('p', { class: 'voice-card__value', text: voice.description || '' }),
    el(
      'div',
      { class: 'voice-card__tags' },
      (voice.tags || []).slice(0, 5).map((tag) => el('span', { class: 'tag', text: tag })),
    ),
  ]);
}

/** Carga el catalogo del proveedor activo. */
export async function loadVoices({ refresh = false } = {}) {
  try {
    const data = await api.voices(refresh);
    update({ voices: data.voices || [] });

    if (!state.voiceId || !data.voices.some((voice) => voice.id === state.voiceId)) {
      update({ voiceId: data.voices[0]?.id || '' });
    }
    renderVoiceOptions();

    if (data.voices.some((voice) => voice.fallback)) {
      toast('warn', 'No se pudo leer el catalogo del proveedor de voz: se muestran las voces de demostracion.');
    }
  } catch (error) {
    toastError(error);
  }
}

/* ======================= ESTILOS (requisito 3) ======================= */

function renderStyles() {
  const list = $('#style-list');
  const styles = state.config?.styles || [];

  fill(
    list,
    styles.map((style) =>
      el('button', {
        class: `chip${style.id === state.styleId ? ' is-active' : ''}`,
        attrs: {
          type: 'button',
          role: 'radio',
          'aria-checked': style.id === state.styleId ? 'true' : 'false',
          title: style.description,
        },
        text: `${style.icon} ${style.label}`,
        on: {
          click: () => {
            update({ styleId: style.id });
            savePreferences();
            renderStyles();
            onSettingsChange();
          },
        },
      }),
    ),
  );
}

/* ======================= CONTROLES (requisito 4) ======================= */

const notifyChange = debounce(() => onSettingsChange(), 260);

function renderSliders() {
  const ranges = state.config?.controls?.ranges;
  if (!ranges) return;

  const container = $('#sliders');
  fill(
    container,
    SLIDERS.map(({ key, label, format }) => {
      const range = ranges[key];
      const value = state.controls[key];

      const output = el('span', { class: 'slider__value', text: format(value) });
      const input = el('input', {
        class: 'range',
        attrs: {
          type: 'range',
          min: range.min,
          max: range.max,
          step: range.step,
          value,
          'aria-label': label,
        },
        on: {
          input: (event) => {
            const next = Number(event.target.value);
            update({ controls: { ...state.controls, [key]: next } });
            output.textContent = format(next);
            paintFill(event.target, range);
            savePreferences();
            notifyChange();
          },
        },
      });

      // El relleno de color se define con una variable CSS (sin estilos en linea).
      queueMicrotask(() => paintFill(input, range));

      return el('div', { class: 'slider' }, [
        el('div', { class: 'slider__head' }, [el('span', { class: 'slider__name', text: label }), output]),
        input,
        el('div', { class: 'slider__scale' }, [
          el('span', { text: range.labels[0] }),
          el('span', { text: range.labels[1] }),
        ]),
      ]);
    }),
  );

  renderCapabilityNote();
}

function paintFill(input, range) {
  const percent = ((Number(input.value) - range.min) / (range.max - range.min)) * 100;
  input.style.setProperty('--fill', `${percent}%`);
}

/**
 * Aviso honesto: no todos los motores admiten todos los controles.
 * Es mejor decirlo que dejar que el usuario mueva un mando sin efecto.
 */
function renderCapabilityNote() {
  const note = $('#capability-note');
  const capabilities = state.config?.tts?.capabilities;
  if (!capabilities) {
    note.hidden = true;
    return;
  }

  const missing = [];
  if (!capabilities.rate) missing.push('velocidad');
  if (!capabilities.pitch) missing.push('tono');
  if (!capabilities.volume) missing.push('volumen');

  if (!missing.length) {
    note.hidden = true;
    return;
  }

  note.textContent =
    `El motor de voz actual no admite control directo de ${missing.join(', ')}. ` +
    'La aplicacion lo compensa con las pausas, la puntuacion y las indicaciones de estilo.';
  note.hidden = false;
}

/* ======================= SHORTS (requisito 11) ======================= */

const refreshShorts = debounce(async () => {
  if (!state.shortsMode || !state.script.trim()) return;
  try {
    const report = await api.shorts({ script: state.script, ...currentSettings() });
    update({ shorts: report });
    renderShorts();
  } catch (error) {
    if (error?.name !== 'AbortError') renderShorts();
  }
}, 500);

function renderShorts() {
  const panel = $('#shorts-panel');
  panel.hidden = !state.shortsMode;
  if (!state.shortsMode) return;

  const report = state.shorts;
  if (!report) {
    fill(panel, [el('p', { class: 'inline-note', text: 'Escribe el guion para ver las sugerencias.' })]);
    return;
  }

  fill(panel, [
    el('div', { class: 'shorts__headline' }, [
      el('div', { class: 'shorts__metric' }, [
        el('b', { text: report.estimatedDuration }),
        el('span', { text: 'Duracion aproximada' }),
      ]),
      el('div', { class: 'shorts__metric' }, [
        el('b', { text: String(report.words) }),
        el('span', { text: 'Palabras' }),
      ]),
    ]),
    ...report.suggestions.map((suggestion) =>
      el('div', { class: 'shorts__item', dataset: { level: suggestion.level } }, [
        el('b', { text: suggestion.title }),
        el('p', { text: suggestion.detail }),
        suggestion.items?.length
          ? el('ul', {}, suggestion.items.map((item) => el('li', { text: item })))
          : null,
      ]),
    ),
  ]);
}

export function updateShorts() {
  refreshShorts();
}

/* ======================= ARRANQUE ======================= */

export function initSettings({ onChange = () => {} } = {}) {
  onSettingsChange = onChange;

  // Filtro por tipo de voz.
  for (const button of $$('#voice-gender .segmented__item')) {
    button.addEventListener('click', () => {
      $$('#voice-gender .segmented__item').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      update({ genderFilter: button.dataset.gender });
      savePreferences();
      renderVoiceOptions();
    });
    if (button.dataset.gender === state.genderFilter) {
      $$('#voice-gender .segmented__item').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
    }
  }

  $('#voice').addEventListener('change', (event) => {
    update({ voiceId: event.target.value });
    savePreferences();
    renderVoiceCard(state.voices.find((voice) => voice.id === state.voiceId) || null);
  });

  // Probar voz.
  $('#btn-test-voice').addEventListener('click', async () => {
    const button = $('#btn-test-voice');
    const audio = $('#preview-audio');
    setLoading(button, true);
    try {
      const sample = state.script.trim().slice(0, state.config?.limits?.maxPreviewChars || 320);
      const { audio: preview } = await api.preview({ ...currentSettings(), script: sample });
      audio.src = preview.url;
      await audio.play();
      toast('ok', 'Reproduciendo una muestra de la voz seleccionada.');
    } catch (error) {
      if (error?.name !== 'NotAllowedError') toastError(error);
    } finally {
      setLoading(button, false);
    }
  });

  // Interpretacion automatica.
  const auto = $('#auto-interpret');
  auto.checked = state.autoInterpret;
  auto.addEventListener('change', () => {
    update({ autoInterpret: auto.checked });
    savePreferences();
    onSettingsChange();
  });

  // Restablecer controles.
  $('#btn-reset-controls').addEventListener('click', () => {
    update({ controls: { ...(state.config?.controls?.defaults || {}) } });
    renderSliders();
    savePreferences();
    onSettingsChange();
    toast('info', 'Controles restablecidos.');
  });

  // Modo Shorts.
  const shorts = $('#shorts-mode');
  shorts.addEventListener('change', () => {
    update({ shortsMode: shorts.checked });
    renderShorts();
    refreshShorts();
  });

  renderStyles();
  renderSliders();
  renderShorts();
}

export { renderStyles, renderSliders, renderVoiceOptions };
