import { useEffect } from 'react'
import { ADSTERRA } from './config'

/**
 * Carga una sola vez los formatos de Adsterra que funcionan en todo el sitio (Popunder y
 * Social Bar). Se llama con `enabled = false` en el panel para que nunca se carguen ahí.
 */
export function useAdsterraScripts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    for (const src of [ADSTERRA.popunder, ADSTERRA.socialBar]) {
      if (!src || document.querySelector(`script[src="${src}"]`)) continue
      const script = document.createElement('script')
      script.src = src
      script.setAttribute('data-cfasync', 'false')
      document.body.appendChild(script)
    }
  }, [enabled])
}
