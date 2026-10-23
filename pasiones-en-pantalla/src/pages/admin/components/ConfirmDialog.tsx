import { Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Eliminar', busy, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null
  return (
    <div className="animate-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !busy && onCancel()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-scale-in card w-full max-w-md bg-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <TriangleAlert className="size-5" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-lg font-bold">
              {title}
            </h2>
            <div className="mt-1.5 text-sm text-muted">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" className="btn-ghost py-2.5" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn-danger py-2.5" onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
