import { fetchFile } from '@ffmpeg/util'
import { loadEngine } from './engine'
import { probeInput } from './probe'
import { buildExportPlan, INPUT_NAME, OUTPUT_NAME } from './buildCommand'

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

  return { blob, hasAudio, probe, videoBitrateKbps }
}
