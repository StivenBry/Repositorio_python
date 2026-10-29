/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_BUCKET?: string
  readonly VITE_ADSENSE_CLIENT?: string
  readonly VITE_ADSENSE_SLOT?: string
  readonly VITE_ADSTERRA_POPUNDER?: string
  readonly VITE_ADSTERRA_SOCIAL_BAR?: string
  readonly VITE_ADSTERRA_NATIVE?: string
  readonly VITE_ADSTERRA_BANNER?: string
  readonly VITE_ADSTERRA_BANNER_SIZE?: string
  readonly VITE_ADSTERRA_SMARTLINK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
