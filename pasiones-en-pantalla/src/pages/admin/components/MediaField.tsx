import { FileVideo, ImagePlus, Link2, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useToast } from '../../../context/ToastContext'
import { formatBytes } from '../../../lib/format'
import { isEmbed, isValidVideoUrl, parseSource } from '../../../lib/media'

export interface MediaState {
  mode: 'upload' | 'url'
  /** Archivo nuevo elegido (se sube al guardar). */
  file: File | null
  /** Archivo que ya estaba en Storage (al editar). */
  stored: { url: string; path: string } | null
  /** Enlace escrito en el modo URL. */
  link: string
}

export const emptyMedia = (): MediaState => ({ mode: 'upload', file: null, stored: null, link: '' })

export function mediaFrom(url: string | null, path: string | null): MediaState {
  if (url && path) return { mode: 'upload', file: null, stored: { url, path }, link: '' }
  if (url) return { mode: 'url', file: null, stored: null, link: url }
  return emptyMedia()
}

export const hasMedia = (m: MediaState) => (m.mode === 'upload' ? Boolean(m.file || m.stored) : Boolean(m.link.trim()))

/** URL para previsualizar (blob: del archivo nuevo, el guardado o el enlace). */
export function useMediaPreview(m: MediaState) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!m.file) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(m.file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [m.file])
  if (m.mode === 'upload') return objectUrl ?? m.stored?.url ?? null
  return m.link.trim() || null
}

interface Props {
  kind: 'video' | 'image'
  label: string
  hint?: string
  aspect?: 'poster' | 'wide'
  value: MediaState
  onChange: (value: MediaState) => void
  error?: string
  /** Aviso de tamaño (p. ej. límite del plan gratuito de Supabase). */
  sizeWarningBytes?: number
}

export function MediaField({ kind, label, hint, aspect = 'wide', value, onChange, error, sizeWarningBytes }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [dragging, setDragging] = useState(false)
  const preview = useMediaPreview(value)
  const accept = kind === 'video' ? 'video/mp4,video/webm,video/quicktime,video/*' : 'image/jpeg,image/png,image/webp,image/avif,image/*'
  const parsed = kind === 'video' && value.mode === 'url' && value.link.trim() ? parseSource(value.link) : null

  const pick = (file: File | undefined) => {
    if (!file) return
    const okType = kind === 'video' ? file.type.startsWith('video/') : file.type.startsWith('image/')
    if (!okType) {
      toast.error(kind === 'video' ? 'Selecciona un archivo de video (MP4, WebM o MOV).' : 'Selecciona una imagen (JPG, PNG o WebP).')
      return
    }
    onChange({ ...value, mode: 'upload', file })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files?.[0])
  }

  const tab = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      active ? 'bg-white/15 text-white shadow' : 'text-white/55 hover:text-white'
    }`

  const aspectClass = aspect === 'poster' ? 'aspect-[2/3] max-w-[200px]' : 'aspect-video'
  const fileName = value.file?.name ?? value.stored?.path.split('/').pop()

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <div className="inline-flex rounded-lg bg-ink-2 p-1 ring-1 ring-line" role="tablist">
          <button type="button" role="tab" aria-selected={value.mode === 'upload'} className={tab(value.mode === 'upload')} onClick={() => onChange({ ...value, mode: 'upload' })}>
            <UploadCloud className="size-3.5" /> Subir archivo
          </button>
          <button type="button" role="tab" aria-selected={value.mode === 'url'} className={tab(value.mode === 'url')} onClick={() => onChange({ ...value, mode: 'url' })}>
            <Link2 className="size-3.5" /> Enlace
          </button>
        </div>
      </div>

      {value.mode === 'upload' ? (
        preview ? (
          <div className="animate-fade-in rounded-xl border border-line bg-ink-2 p-3">
            <div className={`relative overflow-hidden rounded-lg bg-black ${aspectClass}`}>
              {kind === 'video' ? (
                <video src={`${preview}#t=1`} controls preload="metadata" className="absolute inset-0 size-full object-contain" />
              ) : (
                <img src={preview} alt="Vista previa" className="absolute inset-0 size-full object-cover" />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className={`flex min-w-0 items-center gap-2 text-white/80 ${aspect === 'poster' ? 'basis-full' : 'flex-1'}`}>
                {kind === 'video' ? <FileVideo className="size-4 shrink-0 text-brand" /> : <ImagePlus className="size-4 shrink-0 text-brand" />}
                <span className="truncate">{fileName}</span>
                {value.file && <span className="shrink-0 text-xs text-muted">{formatBytes(value.file.size)}</span>}
              </span>
              <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => inputRef.current?.click()}>
                <RefreshCw className="size-3.5" /> Cambiar
              </button>
              <button
                type="button"
                className="btn-ghost px-2.5 py-1.5 text-xs hover:bg-red-500/15 hover:text-red-300"
                onClick={() => onChange({ ...value, file: null, stored: null })}
              >
                <Trash2 className="size-3.5" /> Quitar
              </button>
            </div>
            {value.file && sizeWarningBytes && value.file.size > sizeWarningBytes && (
              <p className="mt-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                Este archivo pesa {formatBytes(value.file.size)}. El plan gratuito de Supabase admite hasta {formatBytes(sizeWarningBytes)} por archivo:
                aumenta el límite del bucket o usa la opción “Enlace”.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
              aspect === 'poster' ? 'aspect-[2/3] max-w-[200px]' : 'py-10'
            } ${dragging ? 'border-brand bg-brand/10' : 'border-white/15 bg-ink-2/60 hover:border-white/35 hover:bg-ink-2'} ${error ? 'border-red-400/60' : ''}`}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-brand/15 text-brand">
              {kind === 'video' ? <UploadCloud className="size-6" /> : <ImagePlus className="size-6" />}
            </span>
            <span className="mt-3 text-sm font-semibold">{aspect === 'poster' ? 'Subir imagen' : 'Arrastra un archivo o haz clic'}</span>
            <span className="mt-1 text-xs text-muted">{kind === 'video' ? 'MP4, WebM o MOV' : 'JPG, PNG o WebP'}</span>
          </button>
        )
      ) : (
        <div className="space-y-3">
          <input
            type="url"
            inputMode="url"
            value={value.link}
            onChange={(e) => onChange({ ...value, link: e.target.value })}
            placeholder={kind === 'video' ? 'https://… (.mp4, .m3u8, YouTube, Vimeo o Google Drive)' : 'https://…/imagen.jpg'}
            className={`field ${error ? 'border-red-400/60' : ''}`}
          />
          {parsed && (
            <p className="text-xs text-muted">
              Detectado: <span className="font-semibold text-white">{parsed.label}</span>
              {isEmbed(parsed.kind) && ' · se reproducirá con el reproductor de esa plataforma'}
              {parsed.kind === 'hls' && ' · streaming adaptativo con el reproductor propio'}
            </p>
          )}
          {preview && kind === 'image' && (
            <div className={`relative overflow-hidden rounded-lg bg-black ${aspectClass}`}>
              <img src={preview} alt="Vista previa" className="absolute inset-0 size-full object-cover" />
            </div>
          )}
          {preview && parsed && isValidVideoUrl(value.link) && parsed.kind !== 'hls' && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              {isEmbed(parsed.kind) ? (
                <iframe src={parsed.url.replace('autoplay=1', 'autoplay=0')} title="Vista previa" className="absolute inset-0 size-full" allow="fullscreen" />
              ) : (
                <video src={parsed.url} controls preload="metadata" className="absolute inset-0 size-full object-contain" />
              )}
            </div>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => {
        pick(e.target.files?.[0])
        e.target.value = ''
      }} />
      {hint && !error && <p className="mt-2 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-2 text-xs font-medium text-red-300">{error}</p>}
    </div>
  )
}
