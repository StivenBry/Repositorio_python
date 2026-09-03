import { useEffect, useRef, useState } from 'react'
import { Play, TriangleAlert } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import TextOverlay from './TextOverlay'

export default function VideoPreview() {
  const fileURL = useEditorStore((s) => s.fileURL)
  const transform = useEditorStore((s) => s.transform)
  const color = useEditorStore((s) => s.color)
  const audioMute = useEditorStore((s) => s.audio.mute)
  const setDuration = useEditorStore((s) => s.setDuration)
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  // Some browser builds (notably a few Linux distro packages) ship without
  // an H.264 decoder. The edit/export pipeline doesn't touch the browser's
  // codecs at all, so it still works — only this live preview can't.
  useEffect(() => {
    setPreviewError(false)
    setPlaying(false)
  }, [fileURL])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = transform.speed
  }, [transform.speed])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.muted = audioMute
  }, [audioMute])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
  }

  const videoStyle = {
    transform: `scaleX(${transform.flip ? -1 : 1}) scale(${1 + transform.zoom / 100})`,
    filter: `brightness(${1 + color.brightness / 100}) contrast(${1 + color.contrast / 100}) saturate(${
      1 + color.saturation / 100
    })`,
  }

  return (
    <div
      ref={containerRef}
      data-testid="preview-container"
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-black"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={fileURL}
        playsInline
        loop
        preload="auto"
        muted={audioMute}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPreviewError(true)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          // Nudge the browser to decode+paint a frame instead of showing
          // black before the user hits play (autoplay is blocked anyway).
          e.currentTarget.currentTime = 0
        }}
        style={videoStyle}
        className={`max-h-full max-w-full object-contain transition-[filter] duration-150 ${
          previewError ? 'hidden' : ''
        }`}
      />

      {previewError && (
        <div className="flex max-w-[240px] flex-col items-center gap-3 px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-amber-400">
            <TriangleAlert size={24} />
          </span>
          <p className="text-sm text-neutral-300">
            Tu navegador no puede previsualizar este video, pero la edición y exportación funcionan igual.
          </p>
        </div>
      )}

      {!previewError && !playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Reproducir"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
            <Play size={28} className="ml-1" fill="currentColor" />
          </span>
        </button>
      )}

      <TextOverlay containerRef={containerRef} />

      <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-neutral-300 backdrop-blur">
        Vista previa aproximada
      </p>
    </div>
  )
}
