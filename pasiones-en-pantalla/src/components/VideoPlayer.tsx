import {
  ArrowLeft,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  TriangleAlert,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { formatClock } from '../lib/format'
import { readVolume, writeVolume } from '../lib/localStore'
import { isEmbed, parseSource, type ParsedSource } from '../lib/media'

interface PlayerProps {
  src: string
  title: string
  poster?: string | null
  autoPlay?: boolean
  /** Segundo desde el que se reanuda (Continuar viendo). */
  startAt?: number
  onBack?: () => void
  onEnded?: () => void
  /** Se llama cada ~5 s y al pausar, para guardar el progreso. */
  onProgress?: (time: number, duration: number) => void
}

export default function VideoPlayer(props: PlayerProps) {
  const source = useMemo(() => parseSource(props.src), [props.src])
  if (isEmbed(source.kind)) return <EmbedPlayer source={source} title={props.title} onBack={props.onBack} />
  return <NativePlayer {...props} source={source} />
}

// ------------------------------------------------------------------ Embeds

function EmbedPlayer({ source, title, onBack }: { source: ParsedSource; title: string; onBack?: () => void }) {
  return (
    <div className="relative size-full bg-black">
      <iframe
        src={source.url}
        title={title}
        className="size-full"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-black/80"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>
      )}
    </div>
  )
}

// ----------------------------------------------------- Reproductor propio

type FullscreenDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void }
type IOSVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const MEDIA_ERRORS: Record<number, string> = {
  1: 'La reproducción fue cancelada.',
  2: 'Error de red al cargar el video. Revisa tu conexión.',
  3: 'El video está dañado o usa un códec no compatible.',
  4: 'Formato no compatible o enlace inaccesible. Usa MP4 (H.264), WebM o HLS (.m3u8).',
}

function NativePlayer({ source, title, poster, autoPlay = true, startAt, onBack, onEnded, onProgress }: PlayerProps & { source: ParsedSource }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const lastSaved = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(() => readVolume().volume)
  const [muted, setMuted] = useState(() => readVolume().muted)
  const [fullscreen, setFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [waiting, setWaiting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rate, setRate] = useState(1)
  const [speedMenu, setSpeedMenu] = useState(false)
  const [flash, setFlash] = useState<{ icon: ReactNode; key: number } | null>(null)
  const [attempt, setAttempt] = useState(0)

  // -------- Carga de la fuente (archivo directo o HLS con hls.js bajo demanda)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let destroy: (() => void) | undefined
    setError(null)
    setWaiting(true)
    video.volume = volume
    video.muted = muted

    if (source.kind === 'hls') {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled) return
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true })
            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) setError('No se pudo cargar la transmisión HLS. Verifica el enlace .m3u8 y que permita CORS.')
            })
            hls.loadSource(source.url)
            hls.attachMedia(video)
            destroy = () => hls.destroy()
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = source.url
          } else {
            setError('Tu navegador no soporta transmisiones HLS.')
          }
        })
        .catch(() => !cancelled && setError('No se pudo cargar el módulo de streaming.'))
    } else {
      video.src = source.url
    }

    return () => {
      cancelled = true
      destroy?.()
      video.removeAttribute('src')
      video.load()
    }
    // volume/muted se aplican solo al cargar; después los controla el usuario.
  }, [source, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Controles que se ocultan solos mientras se reproduce
  const revealControls = useCallback(() => {
    setControlsVisible(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false)
        setSpeedMenu(false)
      }
    }, 2800)
  }, [])

  useEffect(() => {
    if (playing) revealControls()
    else {
      window.clearTimeout(hideTimer.current)
      setControlsVisible(true)
    }
  }, [playing, revealControls])

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  // -------- Acciones
  const showFlash = (icon: ReactNode) => setFlash({ icon, key: Date.now() })

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) {
      v.play().catch(() => undefined)
      showFlash(<Play className="ml-1 size-9 fill-white" />)
    } else {
      v.pause()
      showFlash(<Pause className="size-9 fill-white" />)
    }
  }, [])

  const seekTo = useCallback((t: number) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    v.currentTime = Math.max(0, Math.min(v.duration, t))
    setTime(v.currentTime)
  }, [])

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current
      if (!v) return
      seekTo(v.currentTime + delta)
      showFlash(delta < 0 ? <RotateCcw className="size-9" /> : <RotateCw className="size-9" />)
    },
    [seekTo],
  )

  const changeVolume = useCallback((value: number) => {
    const v = videoRef.current
    if (!v) return
    v.volume = Math.max(0, Math.min(1, value))
    v.muted = v.volume === 0
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.muted || v.volume === 0) {
      v.muted = false
      if (v.volume === 0) v.volume = 0.6
    } else v.muted = true
  }, [])

  const toggleFullscreen = useCallback(() => {
    const doc = document as FullscreenDoc
    const el = containerRef.current as FullscreenEl | null
    const video = videoRef.current as IOSVideo | null
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => undefined)
      else doc.webkitExitFullscreen?.()
      return
    }
    if (el?.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
          orientation?.lock?.('landscape').catch(() => undefined)
        })
        .catch(() => undefined)
    } else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen()
    else video?.webkitEnterFullscreen?.() // iPhone
  }, [])

  const togglePip = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {
      /* no soportado */
    }
  }, [])

  useEffect(() => {
    const onChange = () => {
      const doc = document as FullscreenDoc
      setFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  // -------- Atajos de teclado (estilo YouTube)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      if ((e.key === ' ' || e.key === 'Enter') && target.closest('button, a')) return
      const v = videoRef.current
      if (!v) return
      const key = e.key.toLowerCase()
      let handled = true
      if (key === ' ' || key === 'k') togglePlay()
      else if (key === 'arrowleft' || key === 'j') seekBy(-10)
      else if (key === 'arrowright' || key === 'l') seekBy(10)
      else if (key === 'arrowup') changeVolume(v.volume + 0.1)
      else if (key === 'arrowdown') changeVolume(v.volume - 0.1)
      else if (key === 'm') toggleMute()
      else if (key === 'f') toggleFullscreen()
      else if (/^[0-9]$/.test(key) && Number.isFinite(v.duration)) seekTo((v.duration * Number(key)) / 10)
      else handled = false
      if (handled) {
        e.preventDefault()
        revealControls()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seekBy, seekTo, changeVolume, toggleMute, toggleFullscreen, revealControls])

  // -------- Eventos del <video>
  const saveProgress = (force = false) => {
    const v = videoRef.current
    if (!v || !onProgress || !Number.isFinite(v.duration)) return
    if (force || Math.abs(v.currentTime - lastSaved.current) >= 5) {
      lastSaved.current = v.currentTime
      onProgress(v.currentTime, v.duration)
    }
  }

  const handleLoadedMetadata = () => {
    const v = videoRef.current
    if (!v) return
    setDuration(Number.isFinite(v.duration) ? v.duration : 0)
    if (startAt && Number.isFinite(v.duration) && startAt < v.duration - 5) v.currentTime = startAt
    if (autoPlay) v.play().catch(() => setPlaying(false))
  }

  const handleProgressEvent = () => {
    const v = videoRef.current
    if (!v || !v.buffered.length) return
    setBuffered(v.buffered.end(v.buffered.length - 1))
  }

  const handleVolumeChange = () => {
    const v = videoRef.current
    if (!v) return
    setVolume(v.volume)
    setMuted(v.muted)
    writeVolume({ volume: v.volume, muted: v.muted })
  }

  const handleError = () => {
    const code = videoRef.current?.error?.code
    if (code) setError(MEDIA_ERRORS[code] ?? 'No se pudo reproducir el video.')
    setWaiting(false)
  }

  // -------- Interacción con la superficie del video
  // Ratón: clic = reproducir/pausar. Táctil: toque = mostrar/ocultar controles.
  const onSurfacePointerUp = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') togglePlay()
    else if (controlsVisible && playing) {
      window.clearTimeout(hideTimer.current)
      setControlsVisible(false)
      setSpeedMenu(false)
    } else revealControls()
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const hidden = !controlsVisible && playing
  const pipSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled

  return (
    <div
      ref={containerRef}
      className={`group/player relative size-full overflow-hidden bg-black select-none ${hidden ? 'cursor-none' : ''}`}
      onPointerMove={(e) => e.pointerType === 'mouse' && revealControls()}
      onMouseLeave={() => playing && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className="size-full object-contain"
        poster={poster ?? undefined}
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime)
          saveProgress()
        }}
        onProgress={handleProgressEvent}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false)
          saveProgress(true)
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onVolumeChange={handleVolumeChange}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
        onEnded={() => {
          setPlaying(false)
          saveProgress(true)
          onEnded?.()
        }}
        onError={handleError}
      />

      {/* Capa de clic/tap */}
      <div className="absolute inset-0" onPointerUp={onSurfacePointerUp} onDoubleClick={toggleFullscreen} aria-hidden />

      {/* Indicador central */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {waiting && !error ? (
          <Loader2 className="size-14 animate-spin text-white/90" aria-label="Cargando" />
        ) : flash ? (
          <span key={flash.key} className="animate-flash flex size-20 items-center justify-center rounded-full bg-black/55">
            {flash.icon}
          </span>
        ) : null}
      </div>

      {!playing && !waiting && !error && (
        <button
          type="button"
          onClick={togglePlay}
          className="animate-scale-in absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand/95 shadow-2xl shadow-black/60 transition hover:scale-105 hover:bg-brand-hover sm:size-24"
          aria-label="Reproducir"
        >
          <Play className="ml-1.5 size-10 fill-white sm:size-12" />
        </button>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
          <div className="max-w-md text-center">
            <TriangleAlert className="mx-auto size-12 text-brand" />
            <p className="mt-4 text-lg font-semibold">No se pudo reproducir el video</p>
            <p className="mt-2 text-sm text-white/70">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" className="btn-primary py-2.5" onClick={() => setAttempt((a) => a + 1)}>
                Reintentar
              </button>
              {onBack && (
                <button type="button" className="btn-secondary py-2.5" onClick={onBack}>
                  Volver
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra superior */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pt-4 pb-14 transition-opacity duration-300 sm:px-6 sm:pt-6 ${
          hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        {onBack && (
          <button type="button" onClick={onBack} className="icon-btn size-11 bg-black/40" aria-label="Volver">
            <ArrowLeft className="size-6" />
          </button>
        )}
        <p className="truncate text-lg font-bold drop-shadow sm:text-xl">{title}</p>
      </div>

      {/* Barra inferior */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-300 sm:px-6 sm:pb-5 ${
          hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        onPointerDown={revealControls}
      >
        <Scrubber time={time} duration={duration} buffered={buffered} onSeek={seekTo} />
        <div className="mt-1 flex items-center gap-0.5 sm:gap-1.5">
          <ControlButton label={playing ? 'Pausar (K)' : 'Reproducir (K)'} onClick={togglePlay}>
            {playing ? <Pause className="size-6 fill-white sm:size-7" /> : <Play className="size-6 fill-white sm:size-7" />}
          </ControlButton>
          <ControlButton label="Retroceder 10 segundos (J)" onClick={() => seekBy(-10)}>
            <SkipIcon dir={-1} />
          </ControlButton>
          <ControlButton label="Adelantar 10 segundos (L)" onClick={() => seekBy(10)}>
            <SkipIcon dir={1} />
          </ControlButton>

          <div className="group/vol flex items-center">
            <ControlButton label={muted ? 'Activar sonido (M)' : 'Silenciar (M)'} onClick={toggleMute}>
              <VolumeIcon className="size-6 sm:size-7" />
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volumen"
              className="h-1 w-0 cursor-pointer opacity-0 transition-all duration-200 group-hover/vol:mr-2 group-hover/vol:w-24 group-hover/vol:opacity-100 focus-visible:mr-2 focus-visible:w-24 focus-visible:opacity-100 pointer-coarse:hidden"
            />
          </div>

          <span className="ml-1 text-xs font-medium whitespace-nowrap text-white/90 tabular-nums sm:text-sm">
            {formatClock(time)} <span className="text-white/50">/ {formatClock(duration)}</span>
          </span>

          <div className="flex-1" />

          <div className="relative">
            <ControlButton label="Velocidad de reproducción" onClick={() => setSpeedMenu((o) => !o)}>
              <span className="text-sm font-bold tabular-nums">{rate}x</span>
            </ControlButton>
            {speedMenu && (
              <div className="animate-scale-in absolute right-0 bottom-full mb-2 w-32 origin-bottom-right overflow-hidden rounded-lg border border-line bg-panel/95 py-1 shadow-2xl backdrop-blur">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.playbackRate = s
                      setSpeedMenu(false)
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-white/10 ${s === rate ? 'font-bold text-brand' : 'text-white/85'}`}
                  >
                    {s === 1 ? 'Normal' : `${s}x`}
                  </button>
                ))}
              </div>
            )}
          </div>
          {pipSupported && (
            <ControlButton label="Imagen en imagen" onClick={togglePip} className="max-sm:hidden">
              <PictureInPicture2 className="size-6" />
            </ControlButton>
          )}
          <ControlButton label={fullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize className="size-6 sm:size-7" /> : <Maximize className="size-6 sm:size-7" />}
          </ControlButton>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex size-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white active:scale-90 sm:size-12 ${className}`}
    >
      {children}
    </button>
  )
}

function SkipIcon({ dir }: { dir: 1 | -1 }) {
  const Icon = dir < 0 ? RotateCcw : RotateCw
  return (
    <span className="relative inline-flex">
      <Icon className="size-6 sm:size-7" strokeWidth={1.8} />
      <span className="absolute inset-0 flex items-center justify-center pt-px text-[0.5rem] font-bold sm:text-[0.58rem]">10</span>
    </span>
  )
}

/** Barra de progreso con buffer, arrastre y vista previa del tiempo. */
function Scrubber({
  time,
  duration,
  buffered,
  onSeek,
}: {
  time: number
  duration: number
  buffered: number
  onSeek: (t: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null)
  const [drag, setDrag] = useState<number | null>(null)

  const at = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return { x: ratio * rect.width, t: ratio * (duration || 0) }
  }

  const shown = drag ?? time
  const pct = duration ? (shown / duration) * 100 : 0
  const bufPct = duration ? Math.min(100, (buffered / duration) * 100) : 0

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Progreso del video"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatClock(shown)} de ${formatClock(duration)}`}
      className="group/scrub relative flex h-6 cursor-pointer touch-none items-center"
      onPointerDown={(e) => {
        if (!duration) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(at(e.clientX).t)
      }}
      onPointerMove={(e) => {
        if (!duration) return
        const p = at(e.clientX)
        setHover(p)
        if (drag !== null) setDrag(p.t)
      }}
      onPointerUp={(e) => {
        if (drag !== null) onSeek(at(e.clientX).t)
        setDrag(null)
      }}
      onPointerCancel={() => setDrag(null)}
      onPointerLeave={() => setHover(null)}
    >
      <div className="relative h-1 w-full rounded-full bg-white/25 transition-[height] duration-150 group-hover/scrub:h-1.5">
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${bufPct}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${pct}%` }} />
        <div
          className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-lg ring-4 ring-brand/25 transition-transform duration-150 group-hover/scrub:scale-100 ${
            drag !== null ? 'scale-100' : 'scale-0'
          }`}
          style={{ left: `${pct}%` }}
        />
      </div>
      {hover && duration > 0 && (
        <div
          className="pointer-events-none absolute bottom-7 -translate-x-1/2 rounded-md bg-black/85 px-2 py-1 text-xs font-semibold tabular-nums"
          style={{ left: hover.x }}
        >
          {formatClock(drag ?? hover.t)}
        </div>
      )}
    </div>
  )
}
