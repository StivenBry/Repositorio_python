import { Gem } from 'lucide-react'

export function Top10Badge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Top 10"
      className={`inline-flex size-7 flex-col items-center justify-center rounded-[3px] bg-hot leading-none font-black text-white shadow-md ${className}`}
    >
      <span className="text-[0.42rem] tracking-wider">TOP</span>
      <span className="-mt-px text-[0.8rem] tracking-tight">10</span>
    </span>
  )
}

export function GemBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Exclusivo"
      className={`inline-flex size-6 items-center justify-center rounded-[3px] bg-white text-gem shadow-md ${className}`}
    >
      <Gem className="size-3.5" strokeWidth={2.4} />
    </span>
  )
}

export function ExclusiveChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-white/15 py-0.5 pr-2 pl-0.5 text-sm font-bold text-white backdrop-blur">
      <GemBadge className="size-5 shadow-none" />
      Exclusivo
    </span>
  )
}

export function RatingBadge({ rating, className = '' }: { rating: string | null; className?: string }) {
  if (!rating) return null
  return (
    <span className={`inline-flex items-center rounded-full border border-white/60 px-2.5 py-px text-[0.8rem] font-medium text-white/90 ${className}`}>
      {rating}
    </span>
  )
}

/** Cinta roja tipo "Nuevos episodios" pegada al borde derecho. */
export function Ribbon({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div
      className={`rounded-l-full bg-gradient-to-r from-ribbon via-[#a3201f] to-[#c42b2b]/80 py-2.5 pr-10 pl-7 text-base font-bold tracking-wide text-white shadow-xl shadow-black/30 sm:py-3.5 sm:pr-16 sm:pl-10 sm:text-xl ${className}`}
    >
      {text}
    </div>
  )
}

export function Dot() {
  return <span className="mx-1 inline-block size-1 rounded-full bg-white/80 align-middle" aria-hidden />
}
