import { CalendarClock, Eye, Film, FolderOpen, Pencil, Plus, RotateCcw, Search, Star, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Artwork } from '../../components/Artwork'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { formatDateTime, formatDuration, isPublished, normalize } from '../../lib/format'
import { parseSource } from '../../lib/media'
import { usePageTitle } from '../../lib/usePageTitle'
import { backend, isDemo } from '../../services'
import { resetDemoData } from '../../services/demoBackend'
import type { Video } from '../../types'
import { ConfirmDialog } from './components/ConfirmDialog'

type StatusFilter = 'all' | 'published' | 'scheduled'

export default function AdminDashboardPage() {
  usePageTitle('Panel de administración')
  const { allVideos, loading, error, refresh } = useCatalog()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [toDelete, setToDelete] = useState<Video | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const categories = useMemo(() => [...new Set(allVideos.map((v) => v.category))].sort((a, b) => a.localeCompare(b, 'es')), [allVideos])

  const stats = useMemo(() => {
    const now = Date.now()
    const published = allVideos.filter((v) => isPublished(v.published_at, now)).length
    return {
      total: allVideos.length,
      published,
      scheduled: allVideos.length - published,
      categories: categories.length,
      featured: allVideos.filter((v) => v.is_featured).length,
    }
  }, [allVideos, categories])

  const rows = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    const now = Date.now()
    return allVideos.filter((v) => {
      if (category && v.category !== category) return false
      if (status === 'published' && !isPublished(v.published_at, now)) return false
      if (status === 'scheduled' && isPublished(v.published_at, now)) return false
      const text = normalize(`${v.title} ${v.category} ${v.tags.join(' ')}`)
      return terms.every((t) => text.includes(t))
    })
  }, [allVideos, query, category, status])

  const cancelDelete = useCallback(() => setToDelete(null), [])
  const cancelReset = useCallback(() => setConfirmReset(false), [])

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await backend.deleteVideo(toDelete)
      toast.success(`“${toDelete.title}” se eliminó`)
      setToDelete(null)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el video.')
    } finally {
      setDeleting(false)
    }
  }

  const doReset = async () => {
    await resetDemoData()
    await refresh()
    setConfirmReset(false)
    toast.success('Catálogo de ejemplo restaurado')
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gestión de videos</h1>
          <p className="mt-1 text-muted">Sube, edita y organiza el catálogo de Pasiones en Pantalla.</p>
        </div>
        <div className="flex gap-2">
          {isDemo && (
            <button type="button" className="btn-ghost py-2.5 text-sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-4" /> Restaurar demo
            </button>
          )}
          <Link to="/admin/nuevo" className="btn-primary py-2.5">
            <Plus className="size-5" /> Nuevo video
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={<Film className="size-5" />} label="Videos" value={stats.total} />
        <Stat icon={<Eye className="size-5" />} label="Publicados" value={stats.published} hint={stats.scheduled ? `${stats.scheduled} programados` : undefined} />
        <Stat icon={<FolderOpen className="size-5" />} label="Categorías" value={stats.categories} />
        <Stat icon={<Star className="size-5" />} label="En portada" value={stats.featured} />
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar videos</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título, categoría o etiqueta…" className="field pl-9" />
          </label>
          <div className="flex gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="field md:w-44" aria-label="Filtrar por categoría">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="field md:w-40" aria-label="Filtrar por estado">
              <option value="all">Todos</option>
              <option value="published">Publicados</option>
              <option value="scheduled">Programados</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-red-300">
            {error}
            <div>
              <button type="button" className="btn-secondary mt-4 py-2 text-sm" onClick={() => void refresh()}>
                Reintentar
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-20 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted">
            {allVideos.length ? 'Ningún video coincide con los filtros.' : 'Todavía no hay videos. ¡Sube el primero!'}
          </div>
        ) : (
          <>
            {/* Tabla (escritorio) */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-line text-xs tracking-wider text-muted uppercase">
                <tr>
                  <th className="py-3 pl-4 font-semibold">Video</th>
                  <th className="px-3 py-3 font-semibold">Categoría</th>
                  <th className="px-3 py-3 font-semibold">Publicación</th>
                  <th className="px-3 py-3 font-semibold">Fuente</th>
                  <th className="py-3 pr-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((v) => (
                  <tr key={v.id} className="transition hover:bg-white/[0.03]">
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative h-[72px] w-12 shrink-0 overflow-hidden rounded bg-ink-2">
                          <Artwork src={v.thumbnail_url ?? v.backdrop_url} title={v.title} showFallbackTitle={false} className="absolute inset-0 size-full" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{v.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">{v.tags.join(' · ') || 'Sin etiquetas'}</p>
                          <Flags video={v} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/85">{v.category}</td>
                    <td className="px-3 py-3">
                      <PublishState video={v} />
                    </td>
                    <td className="px-3 py-3 text-white/70">
                      {parseSource(v.video_url).label}
                      {v.duration_seconds ? <span className="block text-xs text-muted">{formatDuration(v.duration_seconds)}</span> : null}
                    </td>
                    <td className="py-3 pr-4">
                      <RowActions video={v} onDelete={() => setToDelete(v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tarjetas (móvil) */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((v) => (
                <li key={v.id} className="flex gap-3 p-4">
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded bg-ink-2">
                    <Artwork src={v.thumbnail_url ?? v.backdrop_url} title={v.title} showFallbackTitle={false} className="absolute inset-0 size-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{v.title}</p>
                    <p className="text-xs text-muted">{v.category}</p>
                    <div className="mt-1">
                      <PublishState video={v} />
                    </div>
                    <Flags video={v} />
                    <div className="mt-2">
                      <RowActions video={v} onDelete={() => setToDelete(v)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ConfirmDialog open={Boolean(toDelete)} title="¿Eliminar este video?" busy={deleting} onConfirm={confirmDelete} onCancel={cancelDelete}>
        Se eliminará <b className="text-white">“{toDelete?.title}”</b> junto con sus archivos subidos. Esta acción no se puede deshacer.
      </ConfirmDialog>
      <ConfirmDialog open={confirmReset} title="¿Restaurar el catálogo de ejemplo?" confirmLabel="Restaurar" onConfirm={doReset} onCancel={cancelReset}>
        Se borrarán los videos que creaste en modo demo y se cargarán de nuevo los 12 títulos de ejemplo.
      </ConfirmDialog>
    </div>
  )
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted">
        <span className="text-brand">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-amber-300">{hint}</p>}
    </div>
  )
}

function PublishState({ video }: { video: Video }) {
  const live = isPublished(video.published_at)
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          live ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'
        }`}
      >
        {live ? <Eye className="size-3" /> : <CalendarClock className="size-3" />}
        {live ? 'Publicado' : 'Programado'}
      </span>
      <p className="mt-1 text-xs text-muted">{formatDateTime(video.published_at)}</p>
    </div>
  )
}

function Flags({ video }: { video: Video }) {
  const { getPlaylist } = useCatalog()
  const playlist = getPlaylist(video.playlist_id)
  const flags = [
    playlist && `${playlist.title} #${video.playlist_position ?? '?'}`,
    video.is_featured && 'Portada',
    video.is_top10 && 'Top 10',
    video.is_exclusive && 'Exclusivo',
    video.ribbon,
  ].filter(Boolean)
  if (!flags.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {flags.map((f) => (
        <span key={String(f)} className="rounded bg-brand/15 px-1.5 py-0.5 text-[0.68rem] font-semibold text-brand">
          {f}
        </span>
      ))}
    </div>
  )
}

function RowActions({ video, onDelete }: { video: Video; onDelete: () => void }) {
  const btn = 'inline-flex size-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white'
  return (
    <div className="flex items-center gap-1 md:justify-end">
      <Link to={`/video/${video.id}`} target="_blank" rel="noreferrer" className={btn} title="Ver ficha pública" aria-label={`Ver ${video.title}`}>
        <Eye className="size-4" />
      </Link>
      <Link to={`/admin/editar/${video.id}`} className={btn} title="Editar" aria-label={`Editar ${video.title}`}>
        <Pencil className="size-4" />
      </Link>
      <button type="button" onClick={onDelete} className={`${btn} hover:bg-red-500/15 hover:text-red-300`} title="Eliminar" aria-label={`Eliminar ${video.title}`}>
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
