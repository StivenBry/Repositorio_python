import { Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Artwork } from '../components/Artwork'
import { FullPageSpinner } from '../components/States'
import VideoPlayer from '../components/VideoPlayer'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { isPublished } from '../lib/format'
import { getProgress, saveProgress } from '../lib/localStore'
import { usePageTitle } from '../lib/usePageTitle'

const AUTOPLAY_SECONDS = 8

export default function WatchPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { getById, videos, loading, getPlaylist, playlistItems } = useCatalog()
  const { session } = useAuth()
  const video = getById(id)
  const [ended, setEnded] = useState(false)
  const [round, setRound] = useState(0)
  usePageTitle(video ? `Viendo: ${video.title}` : undefined)

  // Se calcula una sola vez por video para no saltar mientras se reproduce.
  const startAt = useMemo(() => (params.get('desde') === '0' ? 0 : (getProgress(id)?.t ?? 0)), [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // En una lista, lo siguiente es el próximo video de la lista; si no, uno de la misma categoría.
  const playlist = getPlaylist(video?.playlist_id)
  const playlistNext = useMemo(() => {
    if (!video || !playlist) return undefined
    const items = playlistItems(playlist.id)
    const index = items.findIndex((v) => v.id === video.id)
    return index >= 0 ? items[index + 1] : undefined
  }, [video, playlist, playlistItems])

  const next = useMemo(() => {
    if (!video) return undefined
    if (playlistNext) return playlistNext
    const pool = videos.filter((v) => v.id !== video.id)
    return pool.find((v) => v.category === video.category) ?? pool[0]
  }, [videos, video, playlistNext])

  // Reproducción continua dentro de una lista: cuenta regresiva y pasa al siguiente.
  const [countdown, setCountdown] = useState<number | null>(null)
  useEffect(() => {
    setCountdown(ended && playlistNext ? AUTOPLAY_SECONDS : null)
  }, [ended, playlistNext])
  useEffect(() => {
    if (countdown === null || !playlistNext) return
    if (countdown <= 0) {
      navigate(`/ver/${playlistNext.id}?desde=0`)
      return
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown, playlistNext, navigate])

  if (loading) return <div className="h-dvh bg-black"><FullPageSpinner /></div>
  if (!video || (!isPublished(video.published_at) && !session)) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-black p-6 text-center">
        <p className="text-xl font-semibold">Este video no está disponible.</p>
        <Link to="/" className="btn-primary">Volver al inicio</Link>
      </div>
    )
  }

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(`/video/${video.id}`))

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <VideoPlayer
        key={`${video.id}-${round}`}
        src={video.video_url}
        title={video.title}
        poster={video.backdrop_url}
        startAt={round === 0 ? startAt : 0}
        onBack={back}
        onEnded={() => setEnded(true)}
        onProgress={(t, d) => saveProgress(video.id, t, d)}
      />

      {ended && (
        <div className="animate-fade-in absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl">
            <p className="text-center text-sm font-semibold tracking-widest text-muted uppercase">Terminaste</p>
            <h2 className="mt-2 text-center text-3xl font-bold">{video.title}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_1.4fr]">
              <button
                type="button"
                onClick={() => {
                  setEnded(false)
                  setRound((r) => r + 1)
                }}
                className="card flex flex-col items-center justify-center gap-3 p-6 transition hover:bg-panel"
              >
                <RotateCcw className="size-8 text-brand" />
                <span className="font-semibold">Volver a ver</span>
              </button>
              {next && (
                <Link
                  to={`/ver/${next.id}?desde=0`}
                  onClick={() => setEnded(false)}
                  className="group/next card overflow-hidden transition hover:ring-2 hover:ring-white/70"
                >
                  <div className="relative aspect-video">
                    <Artwork src={next.backdrop_url ?? next.thumbnail_url} title={next.title} className="absolute inset-0 size-full" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="flex size-14 items-center justify-center rounded-full bg-brand shadow-xl transition group-hover/next:scale-110">
                        <Play className="ml-1 size-7 fill-white" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-xs font-semibold tracking-widest text-brand uppercase">
                      {playlistNext && playlist ? `Siguiente en ${playlist.title}` : 'A continuación'}
                    </p>
                    <p className="mt-1 truncate font-bold">{next.title}</p>
                    {countdown !== null && (
                      <p className="mt-1 text-sm text-muted" aria-live="polite">
                        Empieza en {countdown} s
                      </p>
                    )}
                  </div>
                </Link>
              )}
            </div>
            {countdown !== null && (
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setCountdown(null)} className="text-sm font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline">
                  Cancelar reproducción automática
                </button>
              </div>
            )}
            <div className="mt-6 text-center">
              <button type="button" onClick={back} className="btn-ghost">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
