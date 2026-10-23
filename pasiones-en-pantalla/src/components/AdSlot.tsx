import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT, ADSENSE_SLOT } from '../lib/config'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/** Bloque adaptable de Google AdSense. No renderiza nada si AdSense no está configurado. */
export function AdSlot({ className = '' }: { className?: string }) {
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

  if (!ADSENSE_CLIENT || !ADSENSE_SLOT) return null

  return (
    <aside className={`ad-slot ${className}`} aria-label="Publicidad">
      <p className="mb-1.5 text-center text-[0.65rem] font-semibold tracking-[0.2em] text-white/35 uppercase">Publicidad</p>
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
