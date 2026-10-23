import { useId } from 'react'

/** Isotipo: corazón con botón de reproducción. */
export function LogoMark({ className = 'h-8 w-auto' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 48 44" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a3d" />
          <stop offset="0.55" stopColor="#f26a21" />
          <stop offset="1" stopColor="#e8323e" />
        </linearGradient>
      </defs>
      <path
        d="M24 42C10 32 2 24 2 14 2 6.5 8 1.5 14.5 1.5c4.3 0 7.5 2.3 9.5 5.5 2-3.2 5.2-5.5 9.5-5.5C40 1.5 46 6.5 46 14c0 10-8 18-22 28Z"
        fill={`url(#${id})`}
      />
      <path d="M19.5 12.5 33 21l-13.5 8.5Z" fill="#fff" />
    </svg>
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = {
    sm: { mark: 'h-6', title: 'text-base', sub: 'text-[0.5rem]' },
    md: { mark: 'h-8 lg:h-10', title: 'text-[1.2rem] lg:text-[1.55rem]', sub: 'text-[0.55rem] lg:text-[0.68rem]' },
    lg: { mark: 'h-12', title: 'text-[2rem]', sub: 'text-[0.85rem]' },
  }[size]
  return (
    <span className="flex items-center gap-2.5 select-none" aria-label="Pasiones en Pantalla">
      <LogoMark className={`${s.mark} w-auto drop-shadow-[0_4px_12px_rgba(242,106,33,0.35)]`} />
      <span className="flex flex-col leading-none" aria-hidden>
        <span className={`${s.title} font-black tracking-[-0.03em] text-white italic`}>PASIONES</span>
        <span className={`${s.sub} mt-0.5 font-bold tracking-[0.42em] text-brand`}>EN PANTALLA</span>
      </span>
    </span>
  )
}
