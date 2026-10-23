import { ArrowLeft, Camera, CheckCircle2, Clock, Loader2, Save, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Artwork } from '../../components/Artwork'
import { GemBadge, Top10Badge } from '../../components/Badges'
import { FullPageSpinner } from '../../components/States'
import { useCatalog } from '../../context/CatalogContext'
import { useToast } from '../../context/ToastContext'
import { formatClock, fromDatetimeLocal, toDatetimeLocal } from '../../lib/format'
import { captureFrame, isValidVideoUrl, parseSource, probeDuration } from '../../lib/media'
import { usePageTitle } from '../../lib/usePageTitle'
import { backend, isDemo } from '../../services'
import type { UploadFolder, Video, VideoInput } from '../../types'
import { emptyMedia, hasMedia, MediaField, mediaFrom, useMediaPreview, type MediaState } from './components/MediaField'
import { TagInput } from './components/TagInput'
import { Toggle } from './components/Toggle'

const RATINGS = ['', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA']
const RIBBONS = ['Nuevos episodios', 'Estreno', 'Último capítulo', 'Temporada completa']
const FREE_TIER_LIMIT = 50 * 1024 * 1024

interface FormState {
  title: string
  description: string
  category: string
  tags: string[]
  ageRating: string
  ribbon: string
  duration: string
  publishedAt: string
  isFeatured: boolean
  isTop10: boolean
  isExclusive: boolean
  video: MediaState
  thumbnail: MediaState
  backdrop: MediaState
}

type Errors = Partial<Record<'title' | 'category' | 'video' | 'thumbnail' | 'backdrop' | 'duration', string>>

interface Step {
  key: UploadFolder | 'save'
  label: string
  progress: number
  done: boolean
}

function initialState(video?: Video): FormState {
  return {
    title: video?.title ?? '',
    description: video?.description ?? '',
    category: video?.category ?? '',
    tags: video?.tags ?? [],
    ageRating: video?.age_rating ?? '',
    ribbon: video?.ribbon ?? '',
    duration: video?.duration_seconds ? formatClock(video.duration_seconds) : '',
    publishedAt: toDatetimeLocal(video?.published_at ?? new Date().toISOString()),
    isFeatured: video?.is_featured ?? false,
    isTop10: video?.is_top10 ?? false,
    isExclusive: video?.is_exclusive ?? false,
    video: video ? mediaFrom(video.video_url, video.video_path) : emptyMedia(),
    thumbnail: video ? mediaFrom(video.thumbnail_url, video.thumbnail_path) : emptyMedia(),
    backdrop: video ? mediaFrom(video.backdrop_url, video.backdrop_path) : emptyMedia(),
  }
}

/** "1:20:00" → 4800 · "45:30" → 2730 · "90" → 5400 (minutos) */
function parseDuration(value: string): number | null | 'invalid' {
  const v = value.trim()
  if (!v) return null
  if (/^\d+(\.\d+)?$/.test(v)) return Math.round(Number(v) * 60)
  if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(v)) return v.split(':').reduce((acc, part) => acc * 60 + Number(part), 0)
  return 'invalid'
}

export default function AdminVideoFormPage() {
  const { id } = useParams()
  const { getById, loading } = useCatalog()
  const editing = Boolean(id)
  const video = id ? getById(id) : undefined
  usePageTitle(editing ? 'Editar video' : 'Nuevo video')

  if (editing && loading) return <FullPageSpinner />
  if (editing && !video) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">No encontramos este video.</p>
        <Link to="/admin" className="btn-primary mt-6">
          Volver al panel
        </Link>
      </div>
    )
  }
  return <VideoForm key={id ?? 'new'} original={video} />
}

function VideoForm({ original }: { original?: Video }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { allVideos, refresh } = useCatalog()
  const [form, setForm] = useState<FormState>(() => initialState(original))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState<'thumbnail' | 'backdrop' | null>(null)
  const dirty = useRef(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    dirty.current = true
    setForm((f) => ({ ...f, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const categories = useMemo(() => [...new Set(allVideos.map((v) => v.category))].sort(), [allVideos])
  const knownTags = useMemo(() => [...new Set(allVideos.flatMap((v) => v.tags))].sort(), [allVideos])

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current && !saving) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saving])

  // Detecta la duración automáticamente al elegir un archivo o pegar un enlace directo.
  const videoPreview = useMediaPreview(form.video)
  useEffect(() => {
    if (!videoPreview || form.duration) return
    const kind = parseSource(videoPreview).kind
    if (kind !== 'file' && kind !== 'hls') return
    if (form.video.mode === 'url' && !isValidVideoUrl(videoPreview)) return
    let cancelled = false
    const t = setTimeout(() => {
      probeDuration(kind === 'file' ? parseSource(videoPreview).url : videoPreview).then((d) => {
        if (!cancelled && d) setForm((f) => (f.duration ? f : { ...f, duration: formatClock(d) }))
      })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [videoPreview, form.video.mode, form.duration])

  const thumbPreview = useMediaPreview(form.thumbnail)
  const backdropPreview = useMediaPreview(form.backdrop)
  const scheduled = new Date(fromDatetimeLocal(form.publishedAt)).getTime() > Date.now()

  const frameFromVideo = async (target: 'thumbnail' | 'backdrop') => {
    if (!form.video.file) return
    setCapturing(target)
    try {
      const frame = await captureFrame(form.video.file, target === 'thumbnail' ? 0.25 : 0.4)
      set(target, { ...form[target], mode: 'upload', file: frame })
      toast.success(target === 'thumbnail' ? 'Miniatura creada desde el video' : 'Portada creada desde el video')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo capturar el fotograma.')
    } finally {
      setCapturing(null)
    }
  }

  const validate = (): Errors => {
    const e: Errors = {}
    if (!form.title.trim()) e.title = 'El título es obligatorio.'
    if (!form.category.trim()) e.category = 'Elige o escribe una categoría.'
    if (!hasMedia(form.video)) e.video = 'Sube un archivo de video o pega un enlace.'
    else if (form.video.mode === 'url' && !isValidVideoUrl(form.video.link)) e.video = 'El enlace debe empezar por https://'
    if (form.thumbnail.mode === 'url' && form.thumbnail.link.trim() && !isValidVideoUrl(form.thumbnail.link)) e.thumbnail = 'Enlace de imagen no válido.'
    if (form.backdrop.mode === 'url' && form.backdrop.link.trim() && !isValidVideoUrl(form.backdrop.link)) e.backdrop = 'Enlace de imagen no válido.'
    if (parseDuration(form.duration) === 'invalid') e.duration = 'Usa minutos (90) o h:mm:ss (1:30:00).'
    return e
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      toast.error('Revisa los campos marcados.')
      return
    }

    const plan: Step[] = []
    const uploads: [UploadFolder, MediaState][] = [
      ['videos', form.video],
      ['thumbnails', form.thumbnail],
      ['backdrops', form.backdrop],
    ]
    const labels: Record<UploadFolder, string> = { videos: 'Subiendo video', thumbnails: 'Subiendo miniatura', backdrops: 'Subiendo portada' }
    for (const [folder, m] of uploads) if (m.mode === 'upload' && m.file) plan.push({ key: folder, label: labels[folder], progress: 0, done: false })
    plan.push({ key: 'save', label: original ? 'Guardando cambios' : 'Publicando video', progress: 0, done: false })
    setSteps(plan)
    setSaving(true)

    const update = (key: Step['key'], patch: Partial<Step>) => setSteps((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)))
    const uploaded: string[] = []

    const resolve = async (folder: UploadFolder, m: MediaState) => {
      if (m.mode === 'url') return { url: m.link.trim() || null, path: null }
      if (m.file) {
        const r = await backend.uploadFile(m.file, folder, (p) => update(folder, { progress: p }))
        uploaded.push(r.path)
        update(folder, { progress: 100, done: true })
        return { url: r.url, path: r.path }
      }
      return { url: m.stored?.url ?? null, path: m.stored?.path ?? null }
    }

    try {
      const v = await resolve('videos', form.video)
      const t = await resolve('thumbnails', form.thumbnail)
      const b = await resolve('backdrops', form.backdrop)
      update('save', { progress: 50 })

      const duration = parseDuration(form.duration)
      const input: VideoInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        tags: form.tags,
        video_url: v.url ?? '',
        video_path: v.path,
        thumbnail_url: t.url,
        thumbnail_path: t.path,
        backdrop_url: b.url,
        backdrop_path: b.path,
        age_rating: form.ageRating || null,
        ribbon: form.ribbon.trim() || null,
        duration_seconds: typeof duration === 'number' ? duration : null,
        is_featured: form.isFeatured,
        is_top10: form.isTop10,
        is_exclusive: form.isExclusive,
        published_at: fromDatetimeLocal(form.publishedAt),
      }

      const saved = original ? await backend.updateVideo(original.id, input) : await backend.createVideo(input)
      update('save', { progress: 100, done: true })

      // Borra de Storage los archivos que fueron reemplazados o quitados.
      if (original) {
        const stale = [
          [original.video_path, v.path],
          [original.thumbnail_path, t.path],
          [original.backdrop_path, b.path],
        ]
          .filter(([before, after]) => before && before !== after)
          .map(([before]) => before as string)
        await backend.removeFiles(stale)
      }

      dirty.current = false
      await refresh()
      toast.success(original ? 'Cambios guardados' : `“${saved.title}” se publicó correctamente`)
      navigate('/admin')
    } catch (e) {
      // Si algo falla, no deja archivos huérfanos en Storage.
      if (uploaded.length) await backend.removeFiles(uploaded).catch(() => undefined)
      const message = e instanceof Error ? e.message : 'No se pudo guardar el video.'
      setFormError(message)
      toast.error(message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="animate-fade-in" noValidate>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin" className="icon-btn size-10" aria-label="Volver al panel">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{original ? 'Editar video' : 'Nuevo video'}</h1>
          <p className="text-sm text-muted">{original ? original.title : 'Completa la información y publica en el catálogo.'}</p>
        </div>
      </div>

      {formError && (
        <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          <TriangleAlert className="size-5 shrink-0" />
          {formError}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Section title="Video" description="Sube el archivo o pega un enlace de streaming/almacenamiento.">
            <MediaField
              kind="video"
              label="Archivo de video"
              value={form.video}
              onChange={(m) => set('video', m)}
              error={errors.video}
              sizeWarningBytes={isDemo ? undefined : FREE_TIER_LIMIT}
              hint="Recomendado: MP4 (H.264 + AAC). También: WebM, HLS (.m3u8), YouTube, Vimeo, Google Drive o Dropbox."
            />
            {form.video.mode === 'upload' && form.video.file && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary py-2 text-sm" onClick={() => frameFromVideo('thumbnail')} disabled={Boolean(capturing)}>
                  {capturing === 'thumbnail' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  Usar fotograma como miniatura
                </button>
                <button type="button" className="btn-secondary py-2 text-sm" onClick={() => frameFromVideo('backdrop')} disabled={Boolean(capturing)}>
                  {capturing === 'backdrop' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  Usar fotograma como portada
                </button>
              </div>
            )}
          </Section>

          <Section title="Información">
            <div className="space-y-5">
              <div>
                <label className="label" htmlFor="title">
                  Título <span className="text-brand">*</span>
                </label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={120}
                  className={`field text-base ${errors.title ? 'border-red-400/60' : ''}`}
                  placeholder="Ej. Tierra de Pasión"
                />
                {errors.title && <p className="mt-1.5 text-xs text-red-300">{errors.title}</p>}
              </div>
              <div>
                <label className="label flex justify-between" htmlFor="description">
                  Descripción <span className="text-xs font-normal text-muted">{form.description.length}/1500</span>
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  maxLength={1500}
                  rows={5}
                  className="field resize-y leading-relaxed"
                  placeholder="Sinopsis que verán los usuarios en la ficha del video."
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="category">
                    Categoría <span className="text-brand">*</span>
                  </label>
                  <input
                    id="category"
                    list="category-options"
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={`field ${errors.category ? 'border-red-400/60' : ''}`}
                    placeholder="Novelas, Series, Películas…"
                  />
                  <datalist id="category-options">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {errors.category && <p className="mt-1.5 text-xs text-red-300">{errors.category}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="rating">
                    Clasificación
                  </label>
                  <select id="rating" value={form.ageRating} onChange={(e) => set('ageRating', e.target.value)} className="field">
                    {RATINGS.map((r) => (
                      <option key={r} value={r}>
                        {r || 'Sin clasificar'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <span className="label">Etiquetas</span>
                <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} suggestions={knownTags} placeholder="Drama, Romance, Suspenso…" />
                <p className="mt-1.5 text-xs text-muted">Se usan en el buscador y para recomendar títulos similares.</p>
              </div>
              <div className="sm:w-1/2">
                <label className="label" htmlFor="duration">
                  Duración
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="duration"
                    value={form.duration}
                    onChange={(e) => set('duration', e.target.value)}
                    className={`field pl-9 ${errors.duration ? 'border-red-400/60' : ''}`}
                    placeholder="Se detecta automáticamente"
                  />
                </div>
                {errors.duration && <p className="mt-1.5 text-xs text-red-300">{errors.duration}</p>}
              </div>
            </div>
          </Section>

          <Section title="Imágenes" description="La miniatura vertical se usa en las filas; la portada horizontal en el carrusel y la ficha.">
            <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
              <MediaField kind="image" aspect="poster" label="Miniatura (2:3)" value={form.thumbnail} onChange={(m) => set('thumbnail', m)} error={errors.thumbnail} />
              <MediaField
                kind="image"
                aspect="wide"
                label="Portada (16:9)"
                value={form.backdrop}
                onChange={(m) => set('backdrop', m)}
                error={errors.backdrop}
                hint="Opcional. Si falta, se usa la miniatura."
              />
            </div>
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Section title="Publicación">
            <label className="label" htmlFor="published">
              Fecha de publicación
            </label>
            <div className="flex gap-2">
              <input id="published" type="datetime-local" value={form.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} className="field" />
              <button type="button" className="btn-ghost shrink-0 px-3 py-2 text-xs" onClick={() => set('publishedAt', toDatetimeLocal(new Date().toISOString()))}>
                Ahora
              </button>
            </div>
            <p className={`mt-1.5 text-xs ${scheduled ? 'text-amber-300' : 'text-muted'}`}>
              {scheduled ? 'Programado: será visible para el público en esa fecha.' : 'Visible para el público al guardar.'}
            </p>

            <div className="mt-4 divide-y divide-line border-t border-line">
              <Toggle checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} label="Mostrar en portada" description="Aparece en el carrusel principal." />
              <Toggle checked={form.isTop10} onChange={(v) => set('isTop10', v)} label="Top 10" description="Insignia roja y fila “Top 10”." />
              <Toggle checked={form.isExclusive} onChange={(v) => set('isExclusive', v)} label="Exclusivo" description="Insignia de diamante." />
            </div>

            <label className="label mt-4" htmlFor="ribbon">
              Cinta destacada
            </label>
            <input id="ribbon" list="ribbon-options" value={form.ribbon} onChange={(e) => set('ribbon', e.target.value)} className="field" placeholder="Ej. Nuevos episodios" maxLength={30} />
            <datalist id="ribbon-options">
              {RIBBONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Section>

          <Section title="Vista previa">
            <div className="flex gap-4">
              <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md bg-ink-2 shadow-lg">
                <Artwork key={thumbPreview ?? backdropPreview ?? 'none'} src={thumbPreview ?? backdropPreview} title={form.title || 'Sin título'} className="absolute inset-0 size-full" />
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                  {form.isTop10 && <Top10Badge />}
                  {form.isExclusive && <GemBadge />}
                </div>
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-bold">{form.title || 'Sin título'}</p>
                <p className="mt-1 text-xs text-muted">{[form.category, form.ageRating, form.duration].filter(Boolean).join(' · ') || 'Sin categoría'}</p>
                <p className="mt-2 line-clamp-4 text-xs text-white/70">{form.description || 'Sin descripción.'}</p>
              </div>
            </div>
          </Section>

          <div className="flex gap-3">
            <Link to="/admin" className="btn-ghost flex-1 border border-line">
              Cancelar
            </Link>
            <button type="submit" disabled={saving} className="btn-primary flex-[2]">
              {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
              {original ? 'Guardar cambios' : 'Publicar'}
            </button>
          </div>
        </aside>
      </div>

      {saving && <SaveProgress steps={steps} />}
    </form>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function SaveProgress({ steps }: { steps: Step[] }) {
  return (
    <div className="animate-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="animate-scale-in card w-full max-w-sm bg-panel p-6 shadow-2xl">
        <p className="text-lg font-bold">Guardando…</p>
        <p className="mt-1 text-sm text-muted">No cierres esta pestaña hasta que termine.</p>
        <ul className="mt-5 space-y-4">
          {steps.map((s) => (
            <li key={s.key}>
              <div className="flex items-center justify-between text-sm">
                <span className={`flex items-center gap-2 ${s.done ? 'text-white' : 'text-white/80'}`}>
                  {s.done ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Loader2 className="size-4 animate-spin text-brand" />}
                  {s.label}
                </span>
                <span className="text-xs text-muted tabular-nums">{s.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full transition-[width] duration-300 ${s.done ? 'bg-emerald-400' : 'bg-brand'}`} style={{ width: `${s.progress}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
