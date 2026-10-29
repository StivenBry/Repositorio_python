import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isPublished, slugify } from '../lib/format'
import { backend } from '../services'
import type { Playlist, Video } from '../types'
import { useAuth } from './AuthContext'

/** Lo que se muestra al explorar: un video suelto o una lista que agrupa sus capítulos. */
export type BrowseEntry =
  | { kind: 'video'; key: string; title: string; video: Video }
  | { kind: 'playlist'; key: string; title: string; playlist: Playlist; items: Video[] }

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
  /** Listas de reproducción (todas, aunque estén vacías). */
  playlists: Playlist[]
  refresh: () => Promise<void>
  getById: (id: string) => Video | undefined
  getPlaylist: (id: string | null | undefined) => Playlist | undefined
  /** Videos de una lista en orden. Por defecto solo los publicados. */
  playlistItems: (id: string, includeScheduled?: boolean) => Video[]
  /**
   * Agrupa los capítulos de cada lista en una sola entrada (en la posición de su capítulo
   * más destacado del orden recibido); los videos sin lista quedan como están.
   */
  toEntries: (list: Video[]) => BrowseEntry[]
}

const CatalogContext = createContext<CatalogState | null>(null)

const BASE = import.meta.env.BASE_URL

/** "/demo/x.webp" → "/Repositorio_python/pasiones/demo/x.webp" cuando el sitio vive en una subcarpeta. */
const withBase = <T extends string | null>(url: T): T =>
  (url && BASE !== '/' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith(BASE) ? BASE + url.slice(1) : url) as T

const normalizeVideo = (v: Video): Video => ({
  ...v,
  video_url: withBase(v.video_url),
  thumbnail_url: withBase(v.thumbnail_url),
  backdrop_url: withBase(v.backdrop_url),
  playlist_id: v.playlist_id ?? null,
  playlist_position: v.playlist_position ?? null,
})

const normalizePlaylist = (p: Playlist): Playlist => ({
  ...p,
  description: p.description ?? '',
  cover_url: withBase(p.cover_url ?? null),
  cover_path: p.cover_path ?? null,
})

const byPosition = (a: Video, b: Video) =>
  (a.playlist_position ?? Number.MAX_SAFE_INTEGER) - (b.playlist_position ?? Number.MAX_SAFE_INTEGER) ||
  a.published_at.localeCompare(b.published_at)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [allVideos, setAllVideos] = useState<Video[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const [videos, lists] = await Promise.all([
        backend.listVideos(),
        // Si la base aún no tiene listas (esquema anterior), el catálogo sigue funcionando.
        backend.listPlaylists().catch((e) => {
          console.warn('No se pudieron cargar las listas de reproducción:', e)
          return [] as Playlist[]
        }),
      ])
      setAllVideos(videos.map(normalizeVideo))
      setPlaylists(lists.map(normalizePlaylist))
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
    const byId = new Map(allVideos.map((v) => [v.id, v]))
    const playlistById = new Map(playlists.map((p) => [p.id, p]))

    const publishedItems = new Map<string, Video[]>()
    for (const v of videos) {
      if (!v.playlist_id || !playlistById.has(v.playlist_id)) continue
      const list = publishedItems.get(v.playlist_id) ?? []
      list.push(v)
      publishedItems.set(v.playlist_id, list)
    }
    for (const list of publishedItems.values()) list.sort(byPosition)

    const toEntries = (list: Video[]): BrowseEntry[] => {
      const seen = new Set<string>()
      const entries: BrowseEntry[] = []
      for (const v of list) {
        const playlist = v.playlist_id ? playlistById.get(v.playlist_id) : undefined
        if (!playlist) {
          entries.push({ kind: 'video', key: v.id, title: v.title, video: v })
        } else if (!seen.has(playlist.id)) {
          seen.add(playlist.id)
          entries.push({ kind: 'playlist', key: `lista-${playlist.id}`, title: playlist.title, playlist, items: publishedItems.get(playlist.id) ?? [v] })
        }
      }
      return entries
    }

    // Las categorías cuentan entradas: una lista de 30 capítulos cuenta como 1.
    const byCategory = new Map<string, Video[]>()
    const tagCounts = new Map<string, number>()
    for (const v of videos) {
      byCategory.set(v.category, [...(byCategory.get(v.category) ?? []), v])
      for (const t of v.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    }
    const categories = [...byCategory.entries()]
      .map(([name, list]) => ({ name, count: toEntries(list).length, slug: slugify(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
    const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
    return {
      allVideos,
      videos,
      categories,
      tags,
      playlists,
      loading,
      error,
      refresh,
      getById: (id) => byId.get(id),
      getPlaylist: (id) => (id ? playlistById.get(id) : undefined),
      playlistItems: (id, includeScheduled = false) =>
        includeScheduled ? allVideos.filter((v) => v.playlist_id === id).sort(byPosition) : (publishedItems.get(id) ?? []),
      toEntries,
    }
  }, [allVideos, playlists, loading, error, refresh])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>')
  return ctx
}
