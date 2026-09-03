import { ChevronLeft, RotateCcw } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'

export default function Header() {
  const file = useEditorStore((s) => s.file)
  const reset = useEditorStore((s) => s.reset)
  const resetEdits = useEditorStore((s) => s.resetEdits)
  const hasEdits = useEditorStore((s) => s.hasEdits())
  const processingStatus = useEditorStore((s) => s.processing.status)
  const idle = processingStatus === 'idle'

  const goBack = () => {
    if (hasEdits && !window.confirm('¿Salir sin guardar los cambios?')) return
    reset()
  }

  return (
    <header className="z-10 flex items-center justify-between gap-3 bg-neutral-950 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={goBack}
        disabled={!idle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 disabled:opacity-40"
        aria-label="Volver"
      >
        <ChevronLeft size={20} />
      </button>
      <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-neutral-300">{file?.name}</p>
      <button
        type="button"
        onClick={resetEdits}
        disabled={!hasEdits || !idle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 disabled:opacity-30"
        aria-label="Restablecer ediciones"
      >
        <RotateCcw size={16} />
      </button>
    </header>
  )
}
