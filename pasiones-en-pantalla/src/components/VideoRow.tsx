import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  children: ReactNode
  seeAllHref?: string
}

/** Fila horizontal con flechas (escritorio) y deslizamiento táctil (móvil). */
export function VideoRow({ title, children, seeAllHref }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    update()
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, children])

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const arrow =
    'absolute top-1/2 z-20 hidden h-[45%] min-h-16 w-11 -translate-y-1/2 items-center justify-center bg-ink/70 text-brand backdrop-blur-sm transition hover:bg-ink/90 hover:text-brand-hover md:flex'

  return (
    <section className="relative" aria-label={title}>
      <div className="gutter mb-1 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-[1.75rem]">{title}</h2>
        {seeAllHref && (
          <Link to={seeAllHref} className="shrink-0 text-sm font-semibold text-muted transition hover:text-white">
            Ver todo
          </Link>
        )}
      </div>
      <div className="relative">
        {canLeft && (
          <button type="button" onClick={() => scroll(-1)} className={`${arrow} left-0 rounded-r-lg`} aria-label="Anterior">
            <ChevronLeft className="size-8" strokeWidth={2.2} />
          </button>
        )}
        <div
          ref={scroller}
          onScroll={update}
          className="gutter scrollbar-none flex snap-x snap-mandatory scroll-pl-4 gap-2 overflow-x-auto overscroll-x-contain py-4 sm:scroll-pl-8 sm:gap-3 lg:scroll-pl-[5.75vw]"
        >
          {children}
        </div>
        {canRight && (
          <button type="button" onClick={() => scroll(1)} className={`${arrow} right-0 rounded-l-lg`} aria-label="Siguiente">
            <ChevronRight className="size-8" strokeWidth={2.2} />
          </button>
        )}
      </div>
    </section>
  )
}
