import { ListVideo, Play } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AdSlot } from '../components/AdSlot'
import { Artwork } from '../components/Artwork'
import { EmptyState, FullPageSpinner } from '../components/States'
import { useCatalog } from '../context/CatalogContext'
import { formatDuration } from '../lib/format'
import { useProgress } from '../lib/localStore'
import { usePageTitle } from '../lib/usePageTitle'

export default function PlaylistPage() {
  const { id = '' } = useParams()
  const { getPlaylist, playlistItems, loading } = useCatalog()
  const progress = useProgress()
  const playlist = getPlaylist(id)
  const items = playlist ? playlistItems(playlist.id) : []
  usePageTitle(playlist?.title ?? 'Lista de reproducción')

  if (loading) return <FullPageSpinner />
  if (!playlist || items.length === 0) {
    return (
      <div className="gutter pt-32">
        <EmptyState icon={ListVideo} title={playlist ? 'Esta lista aún no tiene videos' : 'Esta lista no existe'}>
          <Link to="/" className="btn-primary mt-6">
            Volver al inicio
          </Link>
        </EmptyState>
      </div>
    )
  }

  const total = items.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)
  // "Continuar" lleva al primer video con progreso guardado; si no hay, al primero de la lista.
  const resume = items.find((v) => progress[v.id]) ?? items[0]
  const cover = playlist.cover_url ?? items[0].backdrop_url ?? items[0].thumbnail_url
  const ownCover = Boolean(playlist.cover_url)

  return (
    <div>
      <section className={`relative isolate overflow-hidden ${ownCover ? 'flex min-h-[62svh] items-end lg:min-h-[70vh]' : ''}`}>
        <div className="absolute inset-0 -z-10">
          <Artwork
            src={cover}
            title={playlist.title}
            showFallbackTitle={false}
            eager
            className={`size-full ${ownCover ? 'animate-ken-burns object-[70%_center]' : 'scale-105 blur-sm'}`}
          />
          <div className={`absolute inset-0 bg-gradient-to-r from-ink ${ownCover ? 'via-ink/70 to-ink/10' : 'via-ink/85 to-ink/40'}`} />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />
        </div>
        <div className="gutter animate-rise-in w-full pt-28 pb-12 lg:pt-36 lg:pb-16">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-brand uppercase">
            <ListVideo className="size-4" /> Lista de reproducción
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">{playlist.title}</h1>
          <p className="mt-3 text-white/80">
            {items.length} video{items.length === 1 ? '' : 's'}
            {total ? ` · ${formatDuration(total)}` : ''}
          </p>
          {playlist.description && <p className="mt-4 max-w-2xl text-lg text-white/80">{playlist.description}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/ver/${resume.id}`} className="btn-primary px-7 text-lg">
              <Play className="size-5 fill-white" />
              {resume === items[0] && !progress[resume.id] ? 'Reproducir todo' : `Continuar: ${resume.title}`}
            </Link>
          </div>
        </div>
      </section>

      <AdSlot className="gutter mb-8" format="banner" />
      <ol className="gutter space-y-3">
        {items.map((v, i) => {
          const p = progress[v.id]
          return (
            <li key={v.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <Link
                to={`/ver/${v.id}`}
                className="group/item flex items-center gap-4 rounded-xl p-2 transition hover:bg-white/5 sm:gap-6 sm:p-3"
              >
                <span className="hidden w-8 text-right text-2xl font-bold text-white/40 tabular-nums sm:block">{i + 1}</span>
                <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-panel sm:w-56">
                  <Artwork src={v.backdrop_url ?? v.thumbnail_url} title={v.title} className="absolute inset-0 size-full transition duration-500 group-hover/item:scale-105" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover/item:bg-black/35">
                    <Play className="size-9 fill-white opacity-0 transition group-hover/item:opacity-100" />
                  </span>
                  {p && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                      <span className="block h-full bg-brand" style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold sm:text-lg">
                    <span className="text-white/50 sm:hidden">{i + 1}. </span>
                    {v.title}
                  </p>
                  <p className="text-sm text-muted">{[formatDuration(v.duration_seconds), v.category].filter(Boolean).join(' · ')}</p>
                  {v.description && (
                    <div className="mt-1 hidden sm:block">
                      <p className="line-clamp-2 text-sm text-white/70">{v.description}</p>
                    </div>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
      <AdSlot className="gutter mt-12" />
    </div>
  )
}
