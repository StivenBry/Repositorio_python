/**
 * Resultados: barra de progreso, reproductor y mapa de interpretacion
 * (requisitos 5, 8 y 9).
 */

import { $, $$, el, fill, setLoading } from '../utils/dom.js';
import { clock, duration, bytes, slugify, KIND_LABELS, EMOTION_LABELS, REASON_LABELS } from '../utils/format.js';
import { api } from '../api.js';
import { state, update, currentSettings, savePreferences } from '../state.js';
import { toast, toastError } from './toast.js';

/* ======================= PROGRESO (requisito 8) ======================= */

const STEPS = [
  'Analizando guion',
  'Preparando interpretacion',
  'Generando voz',
  'Procesando audio',
  'Audio listo',
];

function renderProgress(activeIndex) {
  const card = $('#progress-card');
  const list = $('#progress-steps');
  card.hidden = false;

  fill(
    list,
    STEPS.map((label, index) => {
      const status = index < activeIndex ? 'is-done' : index === activeIndex ? 'is-active' : '';
      return el('li', { class: `progress__step ${status}`.trim() }, [
        el('span', { class: 'dot', text: index < activeIndex ? '✓' : String(index + 1) }),
        el('span', { text: index === activeIndex && index < STEPS.length - 1 ? `${label}…` : label }),
      ]);
    }),
  );

  const percent = Math.round(((activeIndex + 1) / STEPS.length) * 100);
  $('#progress-fill').style.width = `${percent}%`;
}

function hideProgress(delay = 700) {
  setTimeout(() => {
    $('#progress-card').hidden = true;
    $('#progress-fill').style.width = '0%';
  }, delay);
}

/* ======================= REPRODUCTOR ======================= */

const player = new Audio();
player.preload = 'metadata';
let seeking = false;

function renderPlayerMeta() {
  const audio = state.audio;
  if (!audio) return;
  const parts = [
    audio.format.toUpperCase(),
    bytes(audio.bytes),
    duration(player.duration || audio.durationSeconds),
  ];
  $('#player-meta').textContent = parts.filter(Boolean).join(' · ');
}

function setPlayIcon(playing) {
  const button = $('#btn-play');
  button.classList.toggle('is-playing', playing);
  $('#play-icon').textContent = playing ? '❚❚' : '▶';
  button.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
}

function initPlayerControls() {
  const seek = $('#seek');
  const volume = $('#volume');

  const paintRange = (input) => {
    const percent = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    input.style.setProperty('--fill', `${percent}%`);
  };

  $('#btn-play').addEventListener('click', async () => {
    try {
      if (player.paused) await player.play();
      else player.pause();
    } catch {
      toast('warn', 'El navegador bloqueo la reproduccion. Pulsa de nuevo el boton de play.');
    }
  });

  $('#btn-restart').addEventListener('click', () => {
    player.currentTime = 0;
    seek.value = '0';
    paintRange(seek);
    if (player.paused) player.play().catch(() => {});
  });

  seek.addEventListener('input', () => {
    seeking = true;
    paintRange(seek);
    $('#time-current').textContent = clock((Number(seek.value) / 1000) * (player.duration || 0));
  });
  seek.addEventListener('change', () => {
    if (player.duration) player.currentTime = (Number(seek.value) / 1000) * player.duration;
    seeking = false;
  });

  volume.addEventListener('input', () => {
    player.volume = Number(volume.value) / 100;
    paintRange(volume);
  });
  paintRange(volume);

  player.addEventListener('play', () => setPlayIcon(true));
  player.addEventListener('pause', () => setPlayIcon(false));
  player.addEventListener('ended', () => {
    setPlayIcon(false);
    seek.value = '0';
    paintRange(seek);
    $('#time-current').textContent = '0:00';
  });
  player.addEventListener('loadedmetadata', () => {
    $('#time-total').textContent = clock(player.duration);
    renderPlayerMeta();
  });
  player.addEventListener('timeupdate', () => {
    if (seeking || !player.duration) return;
    seek.value = String(Math.round((player.currentTime / player.duration) * 1000));
    paintRange(seek);
    $('#time-current').textContent = clock(player.currentTime);
  });
  player.addEventListener('error', () => {
    toast('error', 'No se pudo cargar el audio generado. Vuelve a generar la narracion.');
  });

  // Selector de formato de descarga.
  for (const button of $$('.player__download .segmented__item')) {
    button.addEventListener('click', () => {
      $$('.player__download .segmented__item').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      update({ downloadFormat: button.dataset.format });
      savePreferences();
    });
    if (button.dataset.format === state.downloadFormat) {
      $$('.player__download .segmented__item').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
    }
  }

  $('#btn-download').addEventListener('click', onDownload);
}

/** Descarga en el formato elegido, regenerando si hace falta (requisito 9). */
async function onDownload() {
  const audio = state.audio;
  if (!audio) return;

  const button = $('#btn-download');
  const format = state.downloadFormat;
  const filename = `${slugify(state.projectName)}.${format}`;
  const url = `/api/audio/${audio.id}/download?format=${format}&name=${encodeURIComponent(state.projectName)}`;

  // Mismo formato que el generado: descarga directa.
  if (audio.format === format) {
    triggerDownload(url, filename);
    return;
  }

  setLoading(button, true);
  try {
    // El servidor intenta convertir; si no puede, se regenera en ese formato.
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      return;
    }

    toast('info', `Generando de nuevo la narracion en ${format.toUpperCase()}…`);
    const result = await api.generate({
      script: state.script,
      ...currentSettings(),
      format,
      projectName: state.projectName,
      analysis: state.analysis,
    });
    update({ audio: result.audio });
    player.src = result.audio.url;
    renderPlayerMeta();
    triggerDownload(
      `/api/audio/${result.audio.id}/download?name=${encodeURIComponent(state.projectName)}`,
      filename,
    );
  } catch (error) {
    toastError(error);
  } finally {
    setLoading(button, false);
  }
}

function triggerDownload(href, filename) {
  const link = el('a', { attrs: { href, download: filename, rel: 'noopener' } });
  document.body.append(link);
  link.click();
  link.remove();
  toast('ok', `Descargando ${filename}`);
}

/* ======================= INTERPRETACION (requisito 5) ======================= */

function renderAnalysis() {
  const card = $('#analysis-card');
  const analysis = state.analysis;
  const plan = state.plan;

  if (!analysis || !plan) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const providerNames = {
    heuristic: 'Analisis incluido en la aplicacion',
    anthropic: 'Claude',
    openai: 'OpenAI',
    google: 'Gemini',
  };
  $('#analysis-provider').textContent =
    `${providerNames[analysis.provider] || analysis.provider} · ${plan.segments.length} frase(s) · ${duration(plan.estimatedSeconds)}`;

  $('#analysis-summary').textContent = analysis.degraded
    ? `${analysis.summary} ${analysis.degradedReason || ''}`
    : analysis.summary;

  const byIndex = new Map(analysis.sentences.map((item) => [item.index, item]));

  fill(
    $('#analysis-list'),
    plan.segments.map((segment) => {
      const hint = byIndex.get(segment.sentenceIndex) || {};
      const level = segment.emphasis >= 0.6 ? 'high' : segment.emphasis >= 0.3 ? 'mid' : 'low';

      const tags = [];
      if (hint.kind && hint.kind !== 'statement') tags.push(KIND_LABELS[hint.kind] || hint.kind);
      if (segment.emotion && segment.emotion !== 'neutral') {
        tags.push(EMOTION_LABELS[segment.emotion] || segment.emotion);
      }
      for (const reason of segment.reasons || []) {
        const label = REASON_LABELS[reason];
        if (label && !tags.includes(label)) tags.push(label);
      }
      if (segment.rate <= 0.92) tags.push('Mas lento');
      else if (segment.rate >= 1.1) tags.push('Mas rapido');
      if (segment.pauseAfterMs >= 700) tags.push(`Pausa ${(segment.pauseAfterMs / 1000).toFixed(1)} s`);

      return el('div', { class: 'analysis__item', dataset: { level } }, [
        el('span', { class: 'analysis__index', text: String(segment.index + 1).padStart(2, '0') }),
        el('div', {}, [
          el('p', { class: 'analysis__text', text: segment.text }),
          tags.length
            ? el('div', { class: 'analysis__tags' }, tags.map((tag) => el('span', { class: 'tag', text: tag })))
            : null,
          hint.note ? el('p', { class: 'analysis__note', text: hint.note }) : null,
        ]),
      ]);
    }),
  );
}

/* ======================= FLUJO DE GENERACION ======================= */

/**
 * Ejecuta el recorrido completo: analizar -> interpretar -> generar -> oir.
 * Cada paso de la barra corresponde a trabajo real del servidor.
 */
export async function generateNarration() {
  const button = $('#btn-generate');
  if (!state.script.trim()) {
    toast('warn', 'Escribe o pega un guion antes de generar la narracion.');
    return;
  }

  setLoading(button, true);
  $('#player-card').hidden = true;
  renderProgress(0);

  try {
    // Pasos 1 y 2: analisis del guion y plan de interpretacion.
    const analysisResult = await api.analyze({ script: state.script, ...currentSettings() });
    update({
      analysis: analysisResult.analysis,
      plan: analysisResult.plan,
      stats: analysisResult.stats,
    });
    // El plan conoce las pausas reales, asi que su estimacion es mas fiable
    // que la del editor: se muestra esa para no dar dos cifras distintas.
    $('#stat-duration').textContent = duration(analysisResult.plan.estimatedSeconds);
    renderProgress(1);

    if (analysisResult.plan.warnings?.length) {
      toast('warn', analysisResult.plan.warnings[0]);
    }
    if (analysisResult.analysis.degraded) {
      toast('warn', analysisResult.analysis.degradedReason);
    }

    // Pasos 3 y 4: sintesis de voz y preparacion del archivo.
    renderProgress(2);
    const result = await api.generate({
      script: state.script,
      ...currentSettings(),
      projectName: state.projectName,
      analysis: analysisResult.analysis,
    });

    renderProgress(3);
    update({ audio: result.audio });

    // Paso 5: el audio ya se puede escuchar.
    // Asignar `src` ya dispara la carga; llamar tambien a load() aborta esa
    // primera peticion y ensucia la consola del navegador.
    player.src = result.audio.url;
    $('#player-card').hidden = false;
    $('#time-total').textContent = clock(result.audio.durationSeconds);
    renderPlayerMeta();
    renderNotes(result.notes);
    renderAnalysis();
    renderProgress(4);
    hideProgress();

    $('#player-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('ok', 'Narracion generada. Ya puedes escucharla y descargarla.');
  } catch (error) {
    hideProgress(0);
    toastError(error);
  } finally {
    setLoading(button, false);
  }
}

function renderNotes(notes = []) {
  fill(
    $('#player-notes'),
    notes.filter(Boolean).map((note) => el('p', { class: 'notes__item', text: note })),
  );
}

/** Restaura el reproductor al abrir un proyecto guardado. */
export function restoreAudio(audio) {
  if (!audio?.id) {
    $('#player-card').hidden = true;
    player.pause();
    player.removeAttribute('src');
    return;
  }
  update({ audio });
  player.src = audio.url || `/api/audio/${audio.id}`;
  $('#player-card').hidden = false;
  renderPlayerMeta();
  renderNotes([]);
}

export function clearResults() {
  update({ analysis: null, plan: null, audio: null });
  $('#analysis-card').hidden = true;
  $('#player-card').hidden = true;
  player.pause();
  player.removeAttribute('src');
}

export function initResults() {
  initPlayerControls();
}

export { renderAnalysis };
