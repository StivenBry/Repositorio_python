import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="animate-fade-in mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-white/5 text-brand ring-1 ring-line">
        <Icon className="size-8" />
      </span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Cargando">
      <span className="size-10 animate-spin rounded-full border-4 border-white/15 border-t-brand" />
    </div>
  )
}
