import { adsterraKey, adsterraLinkUrl, adsterraScriptUrl, parseBannerSize } from './adsterra'

const env = import.meta.env

const rawUrl = env.VITE_SUPABASE_URL?.trim() ?? ''
const rawKey = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()

// Evita "conectarse" con los valores de ejemplo de .env.example.
const looksLikePlaceholder = (value: string) => !value || /TU-PROYECTO|TU-CLAVE|your-project|your-anon-key/.test(value)

export const SUPABASE_URL = rawUrl.replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = rawKey
export const SUPABASE_BUCKET = env.VITE_SUPABASE_BUCKET?.trim() || 'media'

/** true cuando hay credenciales reales de Supabase; si no, la app corre en modo demo. */
export const isSupabaseConfigured = !looksLikePlaceholder(SUPABASE_URL) && !looksLikePlaceholder(SUPABASE_ANON_KEY)

export const SITE_NAME = 'Pasiones en Pantalla'

// Google AdSense (opcional). Sin un ID válido no se carga nada relacionado con anuncios.
const rawAdsClient = env.VITE_ADSENSE_CLIENT?.trim() ?? ''
const rawAdsSlot = env.VITE_ADSENSE_SLOT?.trim() ?? ''
export const ADSENSE_CLIENT = /^ca-pub-\d{16}$/.test(rawAdsClient) ? rawAdsClient : ''
export const ADSENSE_SLOT = /^\d{6,}$/.test(rawAdsSlot) ? rawAdsSlot : ''

// Adsterra (opcional). Cada formato se activa con su variable; las páginas de los
// bloques las genera vite.config.ts con los mismos valores.
const nativeSrc = adsterraScriptUrl(env.VITE_ADSTERRA_NATIVE)
const bannerSrc = adsterraScriptUrl(env.VITE_ADSTERRA_BANNER)
const bannerSize = parseBannerSize(env.VITE_ADSTERRA_BANNER_SIZE || '468x60')
export const ADSTERRA = {
  popunder: adsterraScriptUrl(env.VITE_ADSTERRA_POPUNDER),
  socialBar: adsterraScriptUrl(env.VITE_ADSTERRA_SOCIAL_BAR),
  smartlink: adsterraLinkUrl(env.VITE_ADSTERRA_SMARTLINK),
  native: Boolean(nativeSrc && adsterraKey(nativeSrc)),
  banner: bannerSrc && adsterraKey(bannerSrc) ? bannerSize : null,
}

/** Ruta pública de un archivo de /public respetando el `base` de Vite. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
