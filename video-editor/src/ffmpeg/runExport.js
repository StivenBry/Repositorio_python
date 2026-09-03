import { fetchFile } from '@ffmpeg/util'
import { loadEngine } from './engine'
import { probeInput } from './probe'
import {
  buildExportPlan,
  INPUT_NAME,
  OUTPUT_NAME,
  FONT_REGULAR_NAME,
  FONT_BOLD_NAME,
  CAPTION_NAME,
} from './buildCommand'

const fontCache = new Map()

async function fetchFontBytes(name) {
  if (fontCache.has(name)) return fontCache.get(name)
  const res = await fetch(`/fonts/${name}`)
  if (!res.ok) throw new Error(`No se pudo cargar la fuente para el texto (${name}).`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  fontCache.set(name, bytes)
  return bytes
}

// Orchestrates one full export: load engine -> write input -> probe ->
// build ffmpeg args from edit state -> encode -> read output -> cleanup.
export async function runExport({ file, duration, editorState, onStage, onProgress }) {
  const logs = []
  const logHandler = ({ message }) => {
    logs.push(message)
    if (logs.length > 300) logs.shift()
  }

  onStage?.('loading-engine')
  const ffmpeg = await loadEngine({
    onLog: logHandler,
    onProgress: ({ progress }) => {
      if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)))
    },
  })

  onStage?.('preparing')
  await ffmpeg.writeFile(INPUT_NAME, await fetchFile(file))

  const caption = editorState.text?.content?.trim()
  if (caption) {
    const fontName = editorState.text.bold ? FONT_BOLD_NAME : FONT_REGULAR_NAME
    await ffmpeg.writeFile(fontName, await fetchFontBytes(fontName))
    await ffmpeg.writeFile(CAPTION_NAME, new TextEncoder().encode(editorState.text.content))
  }

  const probe = await probeInput(ffmpeg, INPUT_NAME, duration)
  logs.length = 0 // drop probe noise so error tails only show the real encode

  const { args, hasAudio, videoBitrateKbps } = buildExportPlan({
    state: editorState,
    probe,
    fileSize: file.size,
  })

  onStage?.('encoding')
  onProgress?.(0)
  const code = await ffmpeg.exec(args)

  if (code !== 0) {
    const tail = logs.slice(-8).join('\n')
    throw new Error(`FFmpeg terminó con un error${tail ? `:\n${tail}` : '.'}`)
  }

  let data
  try {
    data = await ffmpeg.readFile(OUTPUT_NAME)
  } catch {
    const tail = logs.slice(-8).join('\n')
    throw new Error(`No se pudo generar el archivo de salida${tail ? `:\n${tail}` : '.'}`)
  }

  const blob = new Blob([data.buffer], { type: 'video/mp4' })

  await ffmpeg.deleteFile(INPUT_NAME).catch(() => {})
  await ffmpeg.deleteFile(OUTPUT_NAME).catch(() => {})
  if (caption) await ffmpeg.deleteFile(CAPTION_NAME).catch(() => {})

  return { blob, hasAudio, probe, videoBitrateKbps }
}
