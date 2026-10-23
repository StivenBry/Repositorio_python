import { ArrowDown, ArrowUp, Check, ExternalLink, ListVideo, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Artwork } from '../../components/Artwork'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { formatDuration, isPublished } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { backend } from '../../services'
import type { Playlist, Video } from '../../types'
import { ConfirmDialog } from './components/ConfirmDialog'

export default function AdminPlaylistsPage() {
  usePageTitle('Listas de reproducción')
  const { playlists, playlistItems, loading, refresh } = useCatalog()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Playlist | null>(null)
  const [deleting, setDeleting] = useState(false)
  const cancelDelete = useCallback(() => setToDelete(null), [])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const name = title.trim()
    if (!name) return
    if (playlists.some((p) => p.title.trim().toLowerCase() === name.toLowerCase())) {
      toast.error('Ya existe una lista con ese nombre.')
      return
    }
    setCreating(true)
    try {
      await backend.createPlaylist({ title: name, description: description.trim() })
      await refresh()
      setTitle('')
      setDescription('')
      toast.success(`Lista “${name}” creada`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la lista.')
    } finally {
      setCreating(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await backend.deletePlaylist(toDelete.id)
      await refresh()
      toast.success(`Lista “${toDelete.title}” eliminada`)
      setToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la lista.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Listas de reproducción</h1>
      <p className="mt-1 text-muted">
        Agrupa capítulos, temporadas o colecciones. También puedes asignar la lista al subir o editar cada video.
      </p>

      <form onSubmit={create} className="card mt-8 grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end sm:p-5">
        <label className="block">
          <span className="label">Nueva lista</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="field" placeholder="Nombre, p. ej. Temporada 1" />
        </label>
        <label className="block">
          <span className="label">Descripción (opcional)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="field" placeholder="Se muestra en la página de la lista" />
        </label>
        <button type="submit" className="btn-primary py-2.5" disabled={creating || !title.trim()}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Crear
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="skeleton h-24 rounded-2xl" />
        ) : playlists.length === 0 ? (
          <div className="card p-12 text-center text-muted">
            <ListVideo className="mx-auto size-10 text-brand" />
            <p className="mt-3">Todavía no hay listas. Crea la primera arriba o desde el formulario de un video.</p>
          </div>
        ) : (
          playlists.map((p) => <PlaylistCard key={p.id} playlist={p} items={playlistItems(p.id, true)} onDelete={() => setToDelete(p)} />)
        )}
      </div>

      <ConfirmDialog open={Boolean(toDelete)} title="¿Eliminar esta lista?" busy={deleting} onConfirm={confirmDelete} onCancel={cancelDelete}>
        Se eliminará la lista <b className="text-white">“{toDelete?.title}”</b>. Sus videos <b className="text-white">no</b> se borran: quedan sin lista.
      </ConfirmDialog>
    </div>
  )
}

function PlaylistCard({ playlist, items, onDelete }: { playlist: Playlist; items: Video[]; onDelete: () => void }) {
  const { refresh } = useCatalog()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(playlist.title)
  const [description, setDescription] = useState(playlist.description)
  const [busy, setBusy] = useState(false)
  const total = items.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)

  const save = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await backend.updatePlaylist(playlist.id, { title: title.trim(), description: description.trim() })
      await refresh()
      setEditing(false)
      toast.success('Lista actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la lista.')
    } finally {
      setBusy(false)
    }
  }

  /** Guarda el nuevo orden numerando 1..n (solo escribe los que cambian). */
  const applyOrder = async (ordered: (Video | null)[]) => {
    setBusy(true)
    try {
      let n = 0
      for (const v of ordered) {
        if (!v) continue
        n += 1
        if (v.playlist_position !== n) await backend.setVideoPlaylist(v.id, playlist.id, n)
      }
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el orden.')
    } finally {
      setBusy(false)
    }
  }

  const move = (index: number, delta: -1 | 1) => {
    const next = [...items]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    void applyOrder(next)
  }

  const remove = async (video: Video) => {
    setBusy(true)
    try {
      await backend.setVideoPlaylist(video.id, null, null)
      await applyOrder(items.map((v) => (v.id === video.id ? null : v)))
      toast.success(`“${video.title}” quitado de la lista`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar el video.')
      setBusy(false)
    }
  }

  const iconBtn = 'inline-flex size-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30'

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-start gap-3 border-b border-line p-4 sm:p-5">
        {editing ? (
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_1.4fr]">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="field" aria-label="Nombre de la lista" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="field" aria-label="Descripción" placeholder="Descripción" />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{playlist.title}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {items.length} video{items.length === 1 ? '' : 's'}
              {total ? ` · ${formatDuration(total)}` : ''}
              {playlist.description ? ` · ${playlist.description}` : ''}
            </p>
          </div>
        )}
        <div className="flex items-center gap-1">
          {busy && <Loader2 className="mr-1 size-4 animate-spin text-brand" />}
          {editing ? (
            <>
              <button type="button" className={iconBtn} onClick={save} disabled={busy || !title.trim()} title="Guardar" aria-label="Guardar">
                <Check className="size-4" />
              </button>
              <button
                type="button"
                className={iconBtn}
                onClick={() => {
                  setEditing(false)
                  setTitle(playlist.title)
                  setDescription(playlist.description)
                }}
                title="Cancelar"
                aria-label="Cancelar"
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <>
              <Link to={`/lista/${playlist.id}`} className={iconBtn} title="Ver página pública" aria-label={`Ver ${playlist.title}`}>
                <ExternalLink className="size-4" />
              </Link>
              <button type="button" className={iconBtn} onClick={() => setEditing(true)} title="Renombrar" aria-label={`Renombrar ${playlist.title}`}>
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                className={`${iconBtn} hover:bg-red-500/15 hover:text-red-300`}
                onClick={onDelete}
                title="Eliminar lista"
                aria-label={`Eliminar ${playlist.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted">Lista vacía: elígela en el formulario de un video para agregarlo.</p>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((v, i) => (
            <li key={v.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="w-6 text-right text-sm font-bold text-muted tabular-nums">{i + 1}</span>
              <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded bg-ink-2">
                <Artwork src={v.backdrop_url ?? v.thumbnail_url} title={v.title} showFallbackTitle={false} className="absolute inset-0 size-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{v.title}</p>
                <p className="truncate text-xs text-muted">
                  {[formatDuration(v.duration_seconds), isPublished(v.published_at) ? null : 'Programado'].filter(Boolean).join(' · ') || v.category}
                </p>
              </div>
              <div className="flex items-center">
                <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Subir ${v.title}`} title="Subir">
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => move(i, 1)}
                  disabled={busy || i === items.length - 1}
                  aria-label={`Bajar ${v.title}`}
                  title="Bajar"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  className={`${iconBtn} hover:bg-red-500/15 hover:text-red-300`}
                  onClick={() => remove(v)}
                  disabled={busy}
                  aria-label={`Quitar ${v.title} de la lista`}
                  title="Quitar de la lista"
                >
                  <X className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
