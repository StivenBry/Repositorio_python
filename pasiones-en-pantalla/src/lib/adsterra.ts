/**
 * Adsterra: lectura de los códigos y páginas que alojan los anuncios.
 * Lo usan la app y vite.config.ts (que genera esas páginas al compilar), así que no
 * debe depender de import.meta.env ni del DOM.
 */

/** URL del script de un formato ("Get code" → atributo src). Sin comillas ni parámetros. */
const SCRIPT_URL_RE = /^https:\/\/[a-z0-9.-]+\/[\w./-]+$/i
/** Smartlink: un enlace normal, puede llevar parámetros. */
const LINK_URL_RE = /^https:\/\/[^\s"'<>]+$/i

export const adsterraScriptUrl = (value?: string) => {
  const url = (value ?? '').trim()
  return SCRIPT_URL_RE.test(url) ? url : ''
}

export const adsterraLinkUrl = (value?: string) => {
  const url = (value ?? '').trim()
  return LINK_URL_RE.test(url) ? url : ''
}

/** Clave del bloque (32 hex): es el final de la URL del script del Native Banner y de los banners. */
export const adsterraKey = (url: string) => url.match(/\/([a-f0-9]{32})(?:\/invoke\.js)?$/i)?.[1] ?? ''

export const parseBannerSize = (value?: string) => {
  const m = (value ?? '').trim().match(/^(\d{2,4})x(\d{2,4})$/i)
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null
}

/** Rutas (dentro de la carpeta publicada) de las páginas que cargan cada anuncio. */
export const ADSTERRA_NATIVE_PAGE = 'ads/nativo.html'
export const ADSTERRA_BANNER_PAGE = 'ads/banner.html'

/** Mensaje con el que la página del Native Banner avisa a la app de su altura. */
export const AD_HEIGHT_MESSAGE = 'pepAdHeight'

const page = (body: string) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Publicidad</title>
<base target="_blank" />
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  body { color: #e8e9f0; font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  a { color: inherit; }
</style>
</head>
<body>
${body}
</body>
</html>
`

/**
 * El Native Banner busca su contenedor por id al cargar. En una app de una sola página
 * ese div aparece y desaparece al navegar, así que cada bloque vive en su propia página
 * (un iframe) y se vuelve a pedir al cambiar de sección.
 */
export function nativeBannerPage(src: string) {
  const key = adsterraKey(src)
  return page(`<script async="async" data-cfasync="false" src="${src}"></script>
<div id="container-${key}"></div>
<script>
  new ResizeObserver(function () {
    parent.postMessage({ ${AD_HEIGHT_MESSAGE}: Math.ceil(document.body.getBoundingClientRect().height) }, location.origin)
  }).observe(document.body)
</script>`)
}

export function bannerPage(src: string, size: { width: number; height: number }) {
  const key = adsterraKey(src)
  return page(`<script>
  atOptions = { 'key': '${key}', 'format': 'iframe', 'height': ${size.height}, 'width': ${size.width}, 'params': {} };
</script>
<script src="${src}"></script>`)
}
