import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// FFmpeg.wasm core (single-thread build) is fetched once from a CDN at
// runtime and re-used from the service worker cache afterwards, so the
// app works fully offline after the first load. Only the *engine* comes
// from the network — user video files never leave the device.
const FFMPEG_CORE_VERSION = '0.12.10'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Editor de Video Local',
        short_name: 'VideoEdit',
        description:
          'Editor de video 100% local en el navegador: transforma, ajusta audio y color, y exporta en MP4 sin subir tus archivos a ningún servidor.',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://unpkg.com' && url.pathname.includes('@ffmpeg/core'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-core-engine',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  define: {
    __FFMPEG_CORE_VERSION__: JSON.stringify(FFMPEG_CORE_VERSION),
  },
  server: {
    host: true,
  },
})
