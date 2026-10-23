/** Minúsculas y sin tildes, para búsquedas tolerantes ("pasion" encuentra "Pasión"). */
export const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const slugify = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'archivo'

const longDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const safe = (iso: string, fmt: Intl.DateTimeFormat) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : fmt.format(d)
}

export const formatDate = (iso: string) => safe(iso, longDate)
export const formatShortDate = (iso: string) => safe(iso, shortDate)
export const formatDateTime = (iso: string) => safe(iso, dateTime)
export const yearOf = (iso: string) => new Date(iso).getFullYear() || ''

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return ''
  if (seconds < 60) return `${Math.round(seconds)} s`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** 75 → "1:15", 3725 → "1:02:05" */
export function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
export function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fromDatetimeLocal = (value: string) => (value ? new Date(value).toISOString() : new Date().toISOString())

export const isPublished = (iso: string, now = Date.now()) => new Date(iso).getTime() <= now

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}
