import { CheckCircle2, Download, FilePlus2, RotateCcw } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import { formatBytes } from '../utils/format'

export default function ResultOverlay() {
  const processing = useEditorStore((s) => s.processing)
  const result = useEditorStore((s) => s.result)
  const file = useEditorStore((s) => s.file)
  const setProcessing = useEditorStore((s) => s.setProcessing)
  const setResult = useEditorStore((s) => s.setResult)
  const reset = useEditorStore((s) => s.reset)

  if (processing.status !== 'done' || !result) return null

  const originalSize = file?.size || 0
  const diffPct = originalSize ? Math.round((1 - result.size / originalSize) * 100) : 0

  const editAgain = () => {
    if (result.url) URL.revokeObjectURL(result.url)
    setResult(null)
    setProcessing({ status: 'idle', progress: 0, error: null })
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-neutral-950/95 px-8 text-center backdrop-blur-sm">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <CheckCircle2 size={32} />
      </span>
      <div>
        <p className="text-base font-semibold text-white">¡Video listo!</p>
        <p className="mt-1 text-sm text-neutral-400">
          {formatBytes(result.size)}
          {originalSize > 0 && (
            <span className={diffPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {' '}
              ({diffPct >= 0 ? '−' : '+'}
              {Math.abs(diffPct)}% vs. original)
            </span>
          )}
        </p>
      </div>

      <a
        href={result.url}
        download={buildDownloadName(file?.name)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 py-4 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 active:scale-[0.99]"
      >
        <Download size={18} /> Descargar MP4
      </a>

      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={editAgain}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-neutral-800 py-3 text-sm font-medium text-neutral-200 active:opacity-80"
        >
          <RotateCcw size={15} /> Editar de nuevo
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-neutral-800 py-3 text-sm font-medium text-neutral-200 active:opacity-80"
        >
          <FilePlus2 size={15} /> Nuevo video
        </button>
      </div>
    </div>
  )
}

function buildDownloadName(originalName) {
  const base = (originalName || 'video').replace(/\.[^.]+$/, '')
  return `${base}-editado.mp4`
}
