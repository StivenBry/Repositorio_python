import { Check, ChevronDown, Film, ListVideo, Play, Plus, RotateCcw, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdSlot } from '../components/AdSlot'
import { Artwork } from '../components/Artwork'
import { Dot, ExclusiveChip, RatingBadge, Top10Badge } from '../components/Badges'
import { EmptyState, FullPageSpinner } from '../components/States'
import { LandscapeCard, PlaylistTile } from '../components/VideoCard'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useToast } from '../context/ToastContext'
import { formatDate, formatDuration, isPublished, normalize, slugify } from '../lib/format'
import { useMyList, useProgress } from '../lib/localStore'
import { parseSource } from '../lib/media'
import { usePageTitle } from '../lib/usePageTitle'
import type { Video } from '../types'

type Tab = 'playlist' | 'related' | 'details'

export default function DetailPage() {
  const { id = '' } = useParams()
  const { getById, videos, loading } = useCatalog()
  const { session } = useAuth()
  const video = getById(id)
  const visible = video && (isPublished(video.published_at) || session)
  usePageTitle(visible ? video.title : 'Video no encontrado')

  if (loading) return <FullPageSpinner />
  if (!video || !visible) {
    return (
      <div className="gutter pt-32">
        <EmptyState icon={Film} title="Este video no está disponible">
          <p>Puede que haya sido eliminado o que aún no se haya publicado.</p>
          <Link to="/" className="btn-primary mt-6">
            Volver al inicio
          </Link>
        </EmptyState>
      </div>
    )
  }
  return <Detail key={video.id} video={video} catalog={videos} />
}

function Detail({ video, catalog }: { video: Video; catalog: Video[] }) {
  const toast = useToast()
  const { has, toggle } = useMyList()
  const progress = useProgress()[video.id]
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const { getPlaylist, playlistItems, toEntries } = useCatalog()
  const playlist = getPlaylist(video.playlist_id)
  const playlistVideos = playlist ? playlistItems(playlist.id) : []
  const playlistIndex = playlistVideos.findIndex((v) => v.id === video.id)
  const [tab, setTab] = useState<Tab>(playlistVideos.length ? 'playlist' : 'related')
  const inList = has(video.id)
  const scheduled = !isPublished(video.published_at)

  // Otras listas aparecen agrupadas; los capítulos de esta misma lista ya están en su pestaña.
  const related = useMemo(() => {
    const tags = new Set(video.tags.map(normalize))
    const scored = catalog
      .filter((v) => v.id !== video.id && (!video.playlist_id || v.playlist_id !== video.playlist_id))
      .map((v) => ({
        v,
        score: (v.category === video.category ? 3 : 0) + v.tags.filter((t) => tags.has(normalize(t))).length,
      }))
      .sort((a, b) => b.score - a.score || b.v.published_at.localeCompare(a.v.published_at))
      .map((x) => x.v)
    return toEntries(scored).slice(0, 12)
  }, [catalog, video, toEntries])

  // "Ver más" solo aparece si el texto realmente se recorta.
  useEffect(() => {
    const el = descriptionRef.current
    if (!el) return
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [video.description])

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: video.title, text: video.description.slice(0, 120), url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Enlace copiado al portapapeles')
      }
    } catch {
      /* el usuario canceló */
    }
  }

  const onToggleList = () => {
    toggle(video.id)
    toast.success(inList ? 'Quitado de Mi lista' : 'Agregado a Mi lista')
  }

  const meta = [formatDate(video.published_at), video.category, video.tags.slice(0, 3).join(', '), formatDuration(video.duration_seconds)].filter(Boolean)

  return (
    <article>
      <section className="relative isolate min-h-[88svh] overflow-hidden lg:min-h-[92vh]">
        <div className="absolute inset-0 -z-10 lg:left-[28%]">
          <Artwork
            src={video.backdrop_url ?? video.thumbnail_url}
            title={video.title}
            showFallbackTitle={false}
            eager
            className="animate-ken-burns size-full object-[70%_center] lg:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-ink/10 lg:via-ink/50 lg:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-ink via-ink/70 to-transparent" />

        <div className="gutter flex min-h-[88svh] flex-col justify-end pt-28 pb-10 lg:min-h-[92vh] lg:justify-center lg:pt-32">
          <div className="animate-rise-in max-w-3xl">
            {playlist && playlistIndex >= 0 && (
              <Link
                to={`/lista/${playlist.id}`}
                className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/20"
              >
                <ListVideo className="size-4 shrink-0 text-brand" />
                <span className="truncate">{playlist.title}</span>
                <span className="shrink-0 text-white/60 tabular-nums">
                  {playlistIndex + 1}/{playlistVideos.length}
                </span>
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2.5">
              {video.is_top10 && <Top10Badge />}
              {video.is_exclusive && <ExclusiveChip />}
              {scheduled && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-sm font-bold text-amber-300">
                  Programado · solo visible para administradores
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.02] font-bold tracking-tight text-balance">{video.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-base text-white/90 lg:text-[1.15rem]">
              {meta.map((m, i) => (
                <span key={m} className={`flex items-center gap-2.5 ${i === 0 ? 'font-bold text-white' : ''}`}>
                  {i > 0 && <Dot />}
                  {m}
                </span>
              ))}
              <RatingBadge rating={video.age_rating} className="ml-1.5 text-[0.95rem]" />
            </div>

            {video.description && (
              <div className="mt-6 max-w-2xl">
                <p
                  ref={descriptionRef}
                  className={`text-lg leading-relaxed text-white/90 lg:text-[1.35rem] lg:leading-[1.65] ${expanded ? '' : 'line-clamp-4'}`}
                >
                  {video.description}
                </p>
                {(clamped || expanded) && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-lg font-semibold text-white/70 transition hover:text-white"
                  >
                    {expanded ? 'Ver menos' : 'Ver más'}
                    <ChevronDown className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to={`/ver/${video.id}`} className="btn-primary px-7 text-lg">
                <Play className="size-6 fill-white" />
                {progress ? 'Continuar' : 'Ver ahora'}
              </Link>
              {progress && (
                <Link to={`/ver/${video.id}?desde=0`} className="btn-secondary px-5 text-lg">
                  <RotateCcw className="size-5" /> Desde el inicio
                </Link>
              )}
            </div>

            <div className="mt-8 flex items-start gap-8">
              <IconAction label="Mi lista" onClick={onToggleList} active={inList}>
                {inList ? <Check className="size-6" /> : <Plus className="size-6" />}
              </IconAction>
              <IconAction label="Compartir" onClick={share}>
                <Share2 className="size-5" />
              </IconAction>
            </div>
          </div>
        </div>
      </section>

      <section className="gutter">
        <div role="tablist" className="scrollbar-none flex gap-2 overflow-x-auto border-b border-line">
          {(
            [
              ...(playlist && playlistVideos.length ? [['playlist', playlist.title] as const] : []),
              ['related', 'Más como esto'] as const,
              ['details', 'Detalles'] as const,
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`relative max-w-[60vw] shrink-0 truncate px-4 py-4 text-lg font-semibold whitespace-nowrap transition sm:max-w-sm sm:text-xl ${
                tab === key ? 'text-white' : 'text-white/55 hover:text-white/80'
              }`}
            >
              {label}
              <span
                className={`absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-brand transition-transform duration-300 ${tab === key ? 'scale-x-100' : 'scale-x-0'}`}
              />
            </button>
          ))}
        </div>

        <div key={tab} className="animate-fade-in pt-8" role="tabpanel">
          {tab === 'playlist' && playlist ? (
            <div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-7 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {playlistVideos.map((v, i) => (
                  <LandscapeCard
                    key={v.id}
                    video={v}
                    to={`/ver/${v.id}`}
                    index={i + 1}
                    current={v.id === video.id}
                    subtitle={[v.category, formatDuration(v.duration_seconds)].filter(Boolean).join(' · ')}
                  />
                ))}
              </div>
              <Link to={`/lista/${playlist.id}`} className="mt-6 inline-flex items-center gap-2 font-semibold text-brand hover:underline">
                Ver la lista completa →
              </Link>
            </div>
          ) : tab === 'related' ? (
            related.length ? (
              <div className="grid grid-cols-1 gap-x-4 gap-y-7 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {related.map((entry) =>
                  entry.kind === 'playlist' ? (
                    <PlaylistTile key={entry.key} playlist={entry.playlist} items={entry.items} />
                  ) : (
                    <LandscapeCard
                      key={entry.key}
                      video={entry.video}
                      subtitle={[entry.video.category, formatDuration(entry.video.duration_seconds)].filter(Boolean).join(' · ')}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="text-muted">Pronto habrá más títulos como este.</p>
            )
          ) : (
            <dl className="grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-[180px_1fr]">
              <DetailRow label="Título">{video.title}</DetailRow>
              <DetailRow label="Categoría">
                <Link className="text-brand hover:underline" to={`/categoria/${slugify(video.category)}`}>
                  {video.category}
                </Link>
              </DetailRow>
              <DetailRow label="Etiquetas">
                <div className="flex flex-wrap gap-2">
                  {video.tags.length
                    ? video.tags.map((t) => (
                        <Link
                          key={t}
                          to={`/buscar?q=${encodeURIComponent(t)}`}
                          className="rounded-full bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                        >
                          {t}
                        </Link>
                      ))
                    : '—'}
                </div>
              </DetailRow>
              <DetailRow label="Publicado">{formatDate(video.published_at)}</DetailRow>
              <DetailRow label="Duración">{formatDuration(video.duration_seconds) || '—'}</DetailRow>
              <DetailRow label="Clasificación">{video.age_rating || 'Sin clasificar'}</DetailRow>
              <DetailRow label="Formato">{parseSource(video.video_url).label}</DetailRow>
            </dl>
          )}
        </div>
      </section>
      <AdSlot className="gutter mt-14" format="banner" />
    </article>
  )
}

function IconAction({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group/action flex flex-col items-center gap-1.5" aria-pressed={active}>
      <span
        className={`flex size-11 items-center justify-center rounded-full border-2 transition group-hover/action:scale-110 ${
          active ? 'border-brand bg-brand text-white' : 'border-white/80 text-white group-hover/action:border-white'
        }`}
      >
        {children}
      </span>
      <span className="text-sm font-semibold text-white/90">{label}</span>
    </button>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="text-white/90">{children}</dd>
    </>
  )
}
