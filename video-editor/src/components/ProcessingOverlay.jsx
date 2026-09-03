import { useEditorStore } from '../store/useEditorStore'

const STAGE_LABELS = {
  'loading-engine': 'Cargando motor de video (FFmpeg)…',
  preparing: 'Preparando archivo…',
  encoding: 'Codificando video…',
}

const CIRCUMFERENCE = 2 * Math.PI * 44

export default function ProcessingOverlay() {
  const processing = useEditorStore((s) => s.processing)
  if (!['loading-engine', 'preparing', 'encoding'].includes(processing.status)) return null

  const pct = Math.round((processing.progress || 0) * 100)
  const indeterminate = processing.status !== 'encoding'
  const fraction = indeterminate ? 0.25 : Math.max(pct / 100, 0.02)

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-neutral-950/90 px-8 backdrop-blur-sm">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className={`absolute inset-0 -rotate-90 ${indeterminate ? 'animate-spin' : ''}`}
          style={indeterminate ? { animationDuration: '1s' } : undefined}
        >
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(63 63 70)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgb(99 102 241)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            className={indeterminate ? '' : 'transition-[stroke-dashoffset] duration-200'}
          />
        </svg>
        {!indeterminate && <span className="text-lg font-semibold text-white">{pct}%</span>}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white">{STAGE_LABELS[processing.status]}</p>
        <p className="mt-1 text-xs text-neutral-500">No cierres esta pestaña mientras se procesa.</p>
      </div>
    </div>
  )
}
