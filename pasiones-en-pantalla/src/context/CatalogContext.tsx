import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isPublished, slugify } from '../lib/format'
import { backend } from '../services'
import type { Video } from '../types'
import { useAuth } from './AuthContext'

export interface Category {
  name: string
  slug: string
  count: number
}

interface CatalogState {
  /** Todo lo que devuelve el backend (incluye programados si eres admin). */
  allVideos: Video[]
  /** Solo lo ya publicado: es lo que ve el público. */
  videos: Video[]
  categories: Category[]
  tags: string[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getById: (id: string) => Video | undefined
}

const CatalogContext = createContext<CatalogState | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [allVideos, setAllVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setAllVideos(await backend.listVideos())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Recarga al iniciar/cerrar sesión: un admin también ve los videos programados.
  useEffect(() => {
    void refresh()
  }, [refresh, session?.userId])

  const value = useMemo<CatalogState>(() => {
    const now = Date.now()
    const videos = allVideos.filter((v) => isPublished(v.published_at, now))
    const counts = new Map<string, number>()
    const tagCounts = new Map<string, number>()
    for (const v of videos) {
      counts.set(v.category, (counts.get(v.category) ?? 0) + 1)
      for (const t of v.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    }
    const categories = [...counts.entries()]
      .map(([name, count]) => ({ name, count, slug: slugify(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
    const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
    const byId = new Map(allVideos.map((v) => [v.id, v]))
    return { allVideos, videos, categories, tags, loading, error, refresh, getById: (id) => byId.get(id) }
  }, [allVideos, loading, error, refresh])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>')
  return ctx
}
