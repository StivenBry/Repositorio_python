import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Las redes sociales exigen URLs absolutas en og:image. Se toma VITE_SITE_URL o,
 * si no existe, la URL de producción que exponen Vercel/Netlify durante el build.
 */
function absoluteSocialUrls(): Plugin {
  const site =
    process.env.VITE_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    process.env.URL ||
    ''
  return {
    name: 'absolute-social-urls',
    transformIndexHtml(html) {
      if (!site) return html
      const base = site.replace(/\/+$/, '')
      return html
        .replace('content="/og-image.jpg"', `content="${base}/og-image.jpg"`)
        .replace('<meta property="og:type"', `<meta property="og:url" content="${base}/" />\n    <meta property="og:type"`)
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
