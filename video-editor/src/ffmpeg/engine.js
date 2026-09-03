import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

// Single-thread core: no SharedArrayBuffer / cross-origin-isolation headers
// required, so the app runs unmodified on any static host. It is fetched
// once from a CDN and cached by the service worker afterwards.
//
// The ESM build (not UMD) is required here: @ffmpeg/ffmpeg always spawns its
// worker with `{ type: "module" }`, so the worker's `importScripts()` call
// throws and it falls back to `import(coreURL)`, which needs a real
// `export default` — only the esm/ build provides that.
const CORE_VERSION = typeof __FFMPEG_CORE_VERSION__ !== 'undefined' ? __FFMPEG_CORE_VERSION__ : '0.12.10'
const BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`

let ffmpegInstance = null
let loadPromise = null
// A single real listener is registered on the FFmpeg instance for its
// lifetime; callers just swap out the delegate below. This sidesteps any
// ambiguity around off()'s no-handler semantics across versions.
let currentLogCallback = null
let currentProgressCallback = null

export function getFFmpeg() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg()
    ffmpegInstance.on('log', (event) => currentLogCallback?.(event))
    ffmpegInstance.on('progress', (event) => currentProgressCallback?.(event))
  }
  return ffmpegInstance
}

export async function loadEngine({ onProgress, onLog } = {}) {
  const ffmpeg = getFFmpeg()

  if (onLog) currentLogCallback = onLog
  if (onProgress) currentProgressCallback = onProgress

  if (ffmpeg.loaded) return ffmpeg
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const coreURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript')
    const wasmURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
    await ffmpeg.load({ coreURL, wasmURL })
    return ffmpeg
  })()

  try {
    await loadPromise
  } catch (err) {
    loadPromise = null
    throw err
  }

  return ffmpeg
}

export function isEngineLoaded() {
  return !!ffmpegInstance?.loaded
}
