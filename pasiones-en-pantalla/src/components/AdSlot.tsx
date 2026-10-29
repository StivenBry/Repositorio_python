import { useEffect, useRef, useState } from 'react'
import { AD_HEIGHT_MESSAGE, ADSTERRA_BANNER_PAGE, ADSTERRA_NATIVE_PAGE } from '../lib/adsterra'
import { ADSENSE_CLIENT, ADSENSE_SLOT, ADSTERRA, asset } from '../lib/config'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

type AdFormat = 'native' | 'banner'

/**
 * Espacio de publicidad. Con AdSense configurado muestra un bloque adaptable; si no, el
 * formato de Adsterra indicado. No renderiza nada si ese formato no está configurado.
 * El Native Banner solo puede aparecer una vez por página (Adsterra lo busca por id).
 */
export function AdSlot({ className = '', format = 'native' }: { className?: string; format?: AdFormat }) {
  if (ADSENSE_CLIENT && ADSENSE_SLOT) return <AdsenseBlock className={className} />
  if (format === 'native' && ADSTERRA.native) return <AdsterraNative className={className} />
  if (format === 'banner' && ADSTERRA.banner) return <AdsterraBanner className={className} {...ADSTERRA.banner} />
  return null
}

function AdLabel() {
  return <p className="mb-1.5 text-center text-[0.65rem] font-semibold tracking-[0.2em] text-white/35 uppercase">Publicidad</p>
}

function AdsenseBlock({ className }: { className: string }) {
  const ref = useRef<HTMLModElement>(null)

  useEffect(() => {
    const el = ref.current
    // En desarrollo StrictMode monta dos veces: no se pide un anuncio para un bloque ya procesado.
    if (!el || el.dataset.adsbygoogleStatus) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* bloqueador de anuncios o script aún no disponible */
    }
  }, [])

  return (
    <aside className={`ad-slot ${className}`} aria-label="Publicidad">
      <AdLabel />
      <ins
        ref={ref}
        className="adsbygoogle block overflow-hidden rounded-lg"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}

/** Tiempo que se reserva espacio al Native Banner antes de darlo por vacío (bloqueador, sin anuncios). */
const NATIVE_FILL_TIMEOUT_MS = 10_000

/** Native Banner de Adsterra: su página avisa de la altura del anuncio para ajustar el iframe. */
function AdsterraNative({ className }: { className: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [reported, setReported] = useState(0)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return
      const height = (e.data as Record<string, unknown> | null)?.[AD_HEIGHT_MESSAGE]
      if (typeof height === 'number' && Number.isFinite(height)) setReported(Math.min(Math.max(0, height), 1200))
    }
    window.addEventListener('message', onMessage)
    const timer = window.setTimeout(() => setGaveUp(true), NATIVE_FILL_TIMEOUT_MS)
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(timer)
    }
  }, [])

  // Mientras llega el anuncio se reserva un alto aproximado (formato ancho 4:1) para que
  // el bloque sea visible y Adsterra lo cargue; luego se usa el alto real.
  const filled = reported > 0
  return (
    <aside className={`ad-slot ${filled || !gaveUp ? className : ''}`} aria-label="Publicidad">
      {filled && <AdLabel />}
      <iframe
        ref={frameRef}
        src={asset(ADSTERRA_NATIVE_PAGE)}
        title="Publicidad"
        scrolling="no"
        className={`block w-full border-0 ${filled || gaveUp ? '' : 'aspect-[4/1] max-h-72'}`}
        style={filled || gaveUp ? { height: reported } : undefined}
      />
    </aside>
  )
}

/** Banner de tamaño fijo: en pantallas más angostas se reduce proporcionalmente. */
function AdsterraBanner({ className, width, height }: { className: string; width: number; height: number }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => setScale(Math.min(1, box.clientWidth / width)))
    observer.observe(box)
    return () => observer.disconnect()
  }, [width])

  return (
    <aside className={`ad-slot ${className}`} aria-label="Publicidad">
      <AdLabel />
      <div ref={boxRef} className="flex justify-center overflow-hidden" style={{ height: Math.round(height * scale) }}>
        <iframe
          src={asset(ADSTERRA_BANNER_PAGE)}
          title="Publicidad"
          width={width}
          height={height}
          scrolling="no"
          className="block shrink-0 origin-top border-0"
          style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
        />
      </div>
    </aside>
  )
}
