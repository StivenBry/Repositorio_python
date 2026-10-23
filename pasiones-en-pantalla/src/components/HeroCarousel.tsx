import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Video } from '../types'
import { Dot, RatingBadge, Ribbon, Top10Badge } from './Badges'

const INTERVAL = 8000

export function HeroCarousel({ videos }: { videos: Video[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = videos.length

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count])

  useEffect(() => {
    if (index >= count) setIndex(0)
  }, [count, index])

  useEffect(() => {
    if (paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => go(index + 1), INTERVAL)
    return () => clearTimeout(t)
  }, [index, paused, count, go])

  if (!count) return null
  const current = videos[Math.min(index, count - 1)]

  return (
    <section
      className="relative h-[78svh] min-h-[520px] w-full overflow-hidden bg-ink sm:h-[82svh] lg:h-[96vh] lg:max-h-[1100px] lg:min-h-[640px]"
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
        touchX.current = null
      }}
    >
      {videos.map((v, i) => (
        <div
          key={v.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={i !== index}
        >
          {(v.backdrop_url || v.thumbnail_url) && (
            <img
              src={v.backdrop_url ?? v.thumbnail_url ?? ''}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`size-full object-cover object-[68%_center] ${i === index ? 'animate-ken-burns' : ''}`}
            />
          )}
        </div>
      ))}

      {/* Degradados para legibilidad: izquierda (texto), arriba (menú) y abajo (filas). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/35 to-transparent sm:via-ink/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink via-ink/60 to-transparent" />

      {current.ribbon && (
        <div key={`ribbon-${current.id}`} className="animate-fade-in absolute top-[17%] right-0 hidden sm:block">
          <Ribbon text={current.ribbon} />
        </div>
      )}

      <div className="gutter absolute inset-x-0 bottom-[13%] sm:bottom-[24%] lg:bottom-auto lg:top-[29%]">
        <div key={current.id} className="max-w-2xl">
          {current.ribbon && (
            <span className="animate-rise-in mb-3 inline-block rounded-full bg-ribbon px-3 py-1 text-xs font-bold sm:hidden">
              {current.ribbon}
            </span>
          )}
          <h2
            className="animate-rise-in font-display text-[clamp(2.4rem,6.4vw,5.4rem)] leading-[0.95] font-black tracking-tight text-balance uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            style={{ animationDelay: '60ms' }}
          >
            {current.title}
          </h2>
          <div
            className="animate-rise-in mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[0.95rem] font-bold sm:text-lg"
            style={{ animationDelay: '160ms' }}
          >
            {current.is_top10 && <Top10Badge className="mr-1.5" />}
            {[current.category, ...current.tags.slice(0, 2)].map((t, i) => (
              <span key={t} className={`items-center gap-2.5 ${i === 2 ? 'hidden sm:flex' : 'flex'}`}>
                {i > 0 && <Dot />}
                {t}
              </span>
            ))}
            {current.age_rating && (
              <>
                <Dot />
                <RatingBadge rating={current.age_rating} className="ml-1" />
              </>
            )}
          </div>
          <div className="animate-rise-in mt-4 hidden max-w-xl md:block" style={{ animationDelay: '220ms' }}>
            <p className="line-clamp-2 text-base text-white/75 lg:text-lg">{current.description}</p>
          </div>
          <div className="animate-rise-in mt-7 grid grid-cols-2 gap-3 sm:flex sm:gap-7" style={{ animationDelay: '280ms' }}>
            <Link to={`/ver/${current.id}`} className="btn-primary px-4 text-base sm:min-w-56 sm:px-6 sm:py-3.5 sm:text-lg">
              <Play className="size-5 fill-white" />
              Ver ahora
            </Link>
            <Link to={`/video/${current.id}`} className="btn-secondary bg-white/25 px-4 text-base sm:min-w-56 sm:px-6 sm:py-3.5 sm:text-lg">
              Ver Información
            </Link>
          </div>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute top-[38%] left-0 hidden h-16 w-12 items-center justify-center rounded-r-lg bg-ink/60 text-brand backdrop-blur-sm transition hover:bg-ink/90 hover:text-brand-hover md:flex"
            aria-label="Destacado anterior"
          >
            <ChevronLeft className="size-9" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute top-[38%] right-0 hidden h-16 w-12 items-center justify-center rounded-l-lg bg-ink/60 text-brand backdrop-blur-sm transition hover:bg-ink/90 hover:text-brand-hover md:flex"
            aria-label="Destacado siguiente"
          >
            <ChevronRight className="size-9" strokeWidth={2.2} />
          </button>
          <div className="absolute inset-x-0 bottom-[4%] flex justify-center gap-2 sm:bottom-[15%] sm:gap-3 lg:bottom-[25%] lg:gap-6">
            {videos.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => go(i)}
                className="group/dot p-1"
                aria-label={`Ir a ${v.title}`}
                aria-current={i === index}
              >
                <span
                  className={`block size-2.5 rounded-full transition-all duration-300 lg:size-3 ${
                    i === index ? 'scale-110 bg-white' : 'bg-white/45 group-hover/dot:bg-white/75'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[78svh] min-h-[520px] w-full overflow-hidden lg:h-[96vh] lg:max-h-[1100px]">
      <div className="skeleton absolute inset-0 opacity-50" />
      <div className="gutter absolute bottom-[24%] w-full lg:top-[30%]">
        <div className="skeleton h-14 w-2/3 max-w-lg rounded-lg" />
        <div className="skeleton mt-5 h-5 w-1/2 max-w-sm rounded" />
        <div className="mt-8 flex gap-4">
          <div className="skeleton h-12 w-40 rounded-md" />
          <div className="skeleton h-12 w-40 rounded-md" />
        </div>
      </div>
    </div>
  )
}
