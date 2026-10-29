import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  ADSTERRA_BANNER_PAGE,
  ADSTERRA_NATIVE_PAGE,
  adsterraKey,
  adsterraLinkUrl,
  adsterraScriptUrl,
  bannerPage,
  nativeBannerPage,
  parseBannerSize,
} from './src/lib/adsterra.ts'

/**
 * Las redes sociales exigen URLs absolutas en og:image. Se toma VITE_SITE_URL o,
 * si no existe, la URL de producción que exponen Vercel/Netlify durante el build.
 */
const GITHUB_PAGES_ORIGIN = 'https://stivenbry.github.io'

function absoluteSocialUrls(): Plugin {
  let site =
    process.env.VITE_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    process.env.URL ||
    ''
  return {
    name: 'absolute-social-urls',
    configResolved(config) {
      // Build de GitHub Pages (npm run build:pages): el sitio vive en una subcarpeta.
      if (!site && config.base !== '/') site = GITHUB_PAGES_ORIGIN + config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!site) return html
        const base = site.replace(/\/+$/, '')
        return html
          .replace(/(property="og:image" content=")[^"]*og-image\.jpg"/, `$1${base}/og-image.jpg"`)
          .replace('<meta property="og:type"', `<meta property="og:url" content="${base}/" />\n    <meta property="og:type"`)
      },
    },
  }
}

const ADSENSE_CLIENT_RE = /^ca-pub-\d{16}$/

/**
 * Google AdSense: si VITE_ADSENSE_CLIENT es válido, inserta el script y la meta
 * de verificación en el HTML estático (Google los busca ahí) y genera ads.txt.
 */
function googleAdsense(client: string): Plugin {
  return {
    name: 'google-adsense',
    transformIndexHtml() {
      if (!client) return
      return [
        { tag: 'meta', attrs: { name: 'google-adsense-account', content: client }, injectTo: 'head' },
        {
          tag: 'script',
          attrs: { async: true, src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`, crossorigin: 'anonymous' },
          injectTo: 'head',
        },
      ]
    },
    generateBundle() {
      if (!client) return
      this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n` })
    },
  }
}

/**
 * Adsterra: genera las páginas que alojan el Native Banner y el banner (ver src/lib/adsterra.ts).
 * Popunder, Social Bar y Smartlink no necesitan archivos: la app los carga directamente.
 */
function adsterraPages(env: Record<string, string>): Plugin {
  const warnIfInvalid = (name: string, valid: boolean) => {
    if (env[name]?.trim() && !valid) console.warn(`[adsterra] ${name} no es válido; ese formato queda desactivado.`)
  }
  for (const name of ['VITE_ADSTERRA_POPUNDER', 'VITE_ADSTERRA_SOCIAL_BAR']) warnIfInvalid(name, Boolean(adsterraScriptUrl(env[name])))
  warnIfInvalid('VITE_ADSTERRA_SMARTLINK', Boolean(adsterraLinkUrl(env.VITE_ADSTERRA_SMARTLINK)))

  const nativeSrc = adsterraScriptUrl(env.VITE_ADSTERRA_NATIVE)
  const bannerSrc = adsterraScriptUrl(env.VITE_ADSTERRA_BANNER)
  const bannerSize = parseBannerSize(env.VITE_ADSTERRA_BANNER_SIZE || '468x60')
  const native = nativeSrc && adsterraKey(nativeSrc) ? nativeSrc : ''
  const banner = bannerSrc && adsterraKey(bannerSrc) && bannerSize ? bannerSrc : ''
  warnIfInvalid('VITE_ADSTERRA_NATIVE', Boolean(native))
  warnIfInvalid('VITE_ADSTERRA_BANNER', Boolean(banner))

  return {
    name: 'adsterra-pages',
    generateBundle() {
      if (native) this.emitFile({ type: 'asset', fileName: ADSTERRA_NATIVE_PAGE, source: nativeBannerPage(native) })
      if (banner && bannerSize) this.emitFile({ type: 'asset', fileName: ADSTERRA_BANNER_PAGE, source: bannerPage(banner, bannerSize) })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const adsClient = (env.VITE_ADSENSE_CLIENT ?? '').trim()
  if (adsClient && !ADSENSE_CLIENT_RE.test(adsClient)) {
    console.warn(`[adsense] VITE_ADSENSE_CLIENT="${adsClient}" no tiene el formato ca-pub-XXXXXXXXXXXXXXXX; AdSense queda desactivado.`)
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      absoluteSocialUrls(),
      googleAdsense(ADSENSE_CLIENT_RE.test(adsClient) ? adsClient : ''),
      adsterraPages(env),
    ],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
    },
  }
})
