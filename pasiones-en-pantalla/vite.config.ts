import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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

export default defineConfig(({ mode }) => {
  const adsClient = (loadEnv(mode, process.cwd(), 'VITE_').VITE_ADSENSE_CLIENT ?? '').trim()
  if (adsClient && !ADSENSE_CLIENT_RE.test(adsClient)) {
    console.warn(`[adsense] VITE_ADSENSE_CLIENT="${adsClient}" no tiene el formato ca-pub-XXXXXXXXXXXXXXXX; AdSense queda desactivado.`)
  }
  return {
    plugins: [react(), tailwindcss(), absoluteSocialUrls(), googleAdsense(ADSENSE_CLIENT_RE.test(adsClient) ? adsClient : '')],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
    },
  }
})
