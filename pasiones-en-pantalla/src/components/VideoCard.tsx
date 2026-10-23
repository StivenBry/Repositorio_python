import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDuration } from '../lib/format'
import type { Video } from '../types'
import { Artwork } from './Artwork'
import { GemBadge, Top10Badge } from './Badges'

interface PosterProps {
  video: Video
  /** Ancho fijo para filas horizontales; en cuadrículas ocupa la celda. */
  inRow?: boolean
  showTitle?: boolean
}

export function PosterCard({ video, inRow = false, showTitle = false }: PosterProps) {
  return (
    <Link
      to={`/video/${video.id}`}
      className={`group/card relative block shrink-0 snap-start outline-none ${inRow ? 'w-[34vw] sm:w-[25vw] md:w-[19vw] lg:w-[14.6vw] xl:w-[12.4vw]' : 'w-full'}`}
      aria-label={video.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-panel shadow-lg shadow-black/40 ring-white/80 transition duration-300 ease-out group-hover/card:z-10 group-hover/card:scale-[1.06] group-hover/card:shadow-2xl group-hover/card:shadow-black/70 group-hover/card:ring-2 group-focus-visible/card:scale-[1.06] group-focus-visible/card:ring-2">
        <Artwork src={video.thumbnail_url ?? video.backdrop_url} title={video.title} className="absolute inset-0 size-full" />

        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1.5">
          {video.is_top10 && <Top10Badge />}
          {video.is_exclusive && <GemBadge />}
        </div>

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3 opacity-0 transition duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          <span className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-brand shadow-lg shadow-black/50">
            <Play className="ml-0.5 size-5 fill-white" />
          </span>
          <p className="line-clamp-2 text-sm leading-tight font-bold">{video.title}</p>
          <p className="mt-1 truncate text-xs text-white/70">
            {[video.category, formatDuration(video.duration_seconds)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      {showTitle && <p className="mt-2 line-clamp-2 text-sm font-medium text-white/85 group-hover/card:text-white">{video.title}</p>}
    </Link>
  )
}

interface LandscapeProps {
  video: Video
  progress?: number
  inRow?: boolean
  subtitle?: string
  to?: string
}

/** Tarjeta 16:9 (Continuar viendo / Más como esto), similar a la fila de episodios. */
export function LandscapeCard({ video, progress, inRow = false, subtitle, to }: LandscapeProps) {
  return (
    <Link
      to={to ?? `/video/${video.id}`}
      className={`group/card block shrink-0 snap-start outline-none ${inRow ? 'w-[70vw] sm:w-[44vw] md:w-[31vw] lg:w-[23vw] xl:w-[19vw]' : 'w-full'}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-md bg-panel shadow-lg shadow-black/40 ring-white/80 transition duration-300 group-hover/card:ring-2 group-focus-visible/card:ring-2">
        <Artwork
          src={video.backdrop_url ?? video.thumbnail_url}
          title={video.title}
          className="absolute inset-0 size-full transition duration-500 group-hover/card:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-300 group-hover/card:bg-black/35">
          <span className="inline-flex size-12 scale-75 items-center justify-center rounded-full bg-brand/95 opacity-0 shadow-xl transition duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
            <Play className="ml-0.5 size-6 fill-white" />
          </span>
        </div>
        {video.duration_seconds ? (
          <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[0.7rem] font-semibold">
            {formatDuration(video.duration_seconds)}
          </span>
        ) : null}
        {progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <div className="h-full bg-brand" style={{ width: `${Math.max(3, Math.min(100, progress * 100))}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-white/90 group-hover/card:text-white">{video.title}</p>
      {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
    </Link>
  )
}
