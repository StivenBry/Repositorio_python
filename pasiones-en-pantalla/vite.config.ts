import { defineConfig, type Plugin } from 'vite'
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

export default defineConfig({
  plugins: [react(), tailwindcss(), absoluteSocialUrls()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
  },
})
