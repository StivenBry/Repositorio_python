export type SourceKind = 'file' | 'hls' | 'youtube' | 'vimeo' | 'drive'

export interface ParsedSource {
  kind: SourceKind
  /** URL que se asigna al <video> (file/hls) o al <iframe> (plataformas). */
  url: string
  label: string
}

const YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i
const VIMEO = /vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)/i
const DRIVE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/i
const HLS = /\.m3u8(?:$|[?#])/i

/** Reconoce el tipo de enlace para elegir entre el reproductor propio o un embed. */
export function parseSource(raw: string): ParsedSource {
  const url = raw.trim()

  const yt = url.match(YOUTUBE)
  if (yt) {
    return {
      kind: 'youtube',
      label: 'YouTube',
      url: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
    }
  }

  const vimeo = url.match(VIMEO)
  if (vimeo) {
    return { kind: 'vimeo', label: 'Vimeo', url: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&title=0&byline=0&portrait=0` }
  }

  const drive = url.match(DRIVE)
  if (drive) return { kind: 'drive', label: 'Google Drive', url: `https://drive.google.com/file/d/${drive[1]}/preview` }

  if (HLS.test(url)) return { kind: 'hls', label: 'HLS (streaming)', url }

  // Los enlaces compartidos de Dropbox necesitan raw=1 para servir el archivo.
  try {
    const parsed = new URL(url, window.location.origin)
    if (/(^|\.)dropbox\.com$/i.test(parsed.hostname)) {
      parsed.searchParams.delete('dl')
      parsed.searchParams.set('raw', '1')
      return { kind: 'file', label: 'Dropbox', url: parsed.toString() }
    }
  } catch {
    /* URL relativa o inválida: se usa tal cual */
  }

  return { kind: 'file', label: /\.webm(?:$|[?#])/i.test(url) ? 'WebM' : 'Archivo de video', url }
}

/** Plataformas externas usan su propio reproductor (no admiten controles personalizados). */
export const isEmbed = (kind: SourceKind) => kind === 'youtube' || kind === 'vimeo' || kind === 'drive'

export function isValidVideoUrl(value: string) {
  const v = value.trim()
  if (!v) return false
  if (v.startsWith('/')) return true
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Lee la duración (segundos) de un video sin descargarlo completo. */
export function probeDuration(src: string, timeoutMs = 15000): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    let done = false
    const finish = (value: number | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? Math.round(video.duration) : null)
    video.onerror = () => finish(null)
    video.src = src
  })
}

/**
 * Captura un fotograma de un archivo local y lo devuelve como imagen JPEG.
 * Sirve para generar la miniatura o la portada sin herramientas externas.
 */
export function captureFrame(file: File, at = 0.2, maxWidth = 1280): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const cleanup = () => URL.revokeObjectURL(url)
    video.onerror = () => {
      cleanup()
      reject(new Error('No se pudo leer el video para capturar un fotograma.'))
    }
    video.onloadedmetadata = () => {
      const target = Number.isFinite(video.duration) ? video.duration * at : 1
      video.currentTime = Math.max(0.1, target)
    }
    video.onseeked = () => {
      const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round((video.videoWidth || 1280) * scale)
      canvas.height = Math.round((video.videoHeight || 720) * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        reject(new Error('Tu navegador no permite capturar fotogramas.'))
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          cleanup()
          if (!blob) return reject(new Error('No se pudo generar la imagen.'))
          const base = file.name.replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${base}-fotograma.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.86,
      )
    }
    video.src = url
  })
}
