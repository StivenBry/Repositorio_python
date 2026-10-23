import { buildDemoCatalog, buildDemoPlaylists } from '../data/demoCatalog'
import type { AdminSession, Playlist, Video, VideoInput } from '../types'
import { buildStoragePath, storagePathsOf, uid, type Backend } from './backend'
import { idbDelete, idbGet, idbPut } from './idb'

/**
 * Backend local para probar todo sin configurar nada. Los metadatos viven en
 * localStorage y los archivos subidos en IndexedDB de ESTE navegador.
 */
export const DEMO_CREDENTIALS = { email: 'admin@pasiones.demo', password: 'demo1234' }

const VIDEOS_KEY = 'pep:demo:videos:v1'
const PLAYLISTS_KEY = 'pep:demo:playlists:v1'
const SESSION_KEY = 'pep:demo:session'
const IDB_PREFIX = 'idb://'

const objectUrls = new Map<string, string>()
const authListeners = new Set<(s: AdminSession | null) => void>()

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function readPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY)
    if (raw) return JSON.parse(raw) as Playlist[]
  } catch {
    /* datos corruptos: se regeneran */
  }
  const seeded = buildDemoPlaylists()
  writePlaylists(seeded)
  return seeded
}

function writePlaylists(playlists: Playlist[]) {
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists))
  } catch {
    throw new Error('El navegador no permite guardar datos (¿modo privado o almacenamiento lleno?).')
  }
}

function readStored(): Video[] {
  try {
    const raw = localStorage.getItem(VIDEOS_KEY)
    if (raw) return JSON.parse(raw) as Video[]
  } catch {
    /* datos corruptos: se regeneran */
  }
  const seeded = buildDemoCatalog()
  writeStored(seeded)
  return seeded
}

function writeStored(videos: Video[]) {
  try {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos))
  } catch {
    throw new Error('El navegador no permite guardar datos (¿modo privado o almacenamiento lleno?).')
  }
}

/** Convierte "idb://clave" en un blob: URL reproducible. */
async function resolveUrl(url: string | null) {
  if (!url?.startsWith(IDB_PREFIX)) return url
  const key = url.slice(IDB_PREFIX.length)
  const cached = objectUrls.get(key)
  if (cached) return cached
  const blob = await idbGet(key).catch(() => undefined)
  if (!blob) return null
  const objectUrl = URL.createObjectURL(blob)
  objectUrls.set(key, objectUrl)
  return objectUrl
}

async function hydrate(video: Video): Promise<Video> {
  const [video_url, thumbnail_url, backdrop_url] = await Promise.all([
    resolveUrl(video.video_url),
    resolveUrl(video.thumbnail_url),
    resolveUrl(video.backdrop_url),
  ])
  // Videos guardados antes de existir las listas no traen estos campos.
  return {
    ...video,
    video_url: video_url ?? '',
    thumbnail_url,
    backdrop_url,
    playlist_id: video.playlist_id ?? null,
    playlist_position: video.playlist_position ?? null,
  }
}

/** Al guardar, las URLs blob: se vuelven a escribir como idb:// usando su ruta. */
const storedUrl = (url: string | null, path: string | null) => (path && url?.startsWith('blob:') ? IDB_PREFIX + path : url)

async function hydratePlaylist(playlist: Playlist): Promise<Playlist> {
  return { ...playlist, cover_url: await resolveUrl(playlist.cover_url ?? null), cover_path: playlist.cover_path ?? null }
}

function dehydrate(input: VideoInput): VideoInput {
  const toStored = storedUrl
  return {
    ...input,
    video_url: toStored(input.video_url, input.video_path) ?? '',
    thumbnail_url: toStored(input.thumbnail_url, input.thumbnail_path),
    backdrop_url: toStored(input.backdrop_url, input.backdrop_path),
  }
}

async function removeFiles(paths: string[]) {
  await Promise.all(
    paths.map(async (path) => {
      const url = objectUrls.get(path)
      if (url) URL.revokeObjectURL(url)
      objectUrls.delete(path)
      await idbDelete(path).catch(() => undefined)
    }),
  )
}

function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AdminSession) : null
  } catch {
    return null
  }
}

export const demoBackend: Backend = {
  mode: 'demo',

  async listVideos() {
    const stored = readStored().sort((a, b) => b.published_at.localeCompare(a.published_at))
    return Promise.all(stored.map(hydrate))
  },

  async createVideo(input) {
    const now = new Date().toISOString()
    const video: Video = { ...dehydrate(input), id: uid(), created_at: now, updated_at: now }
    writeStored([video, ...readStored()])
    return hydrate(video)
  },

  async updateVideo(id, input) {
    const all = readStored()
    const index = all.findIndex((v) => v.id === id)
    if (index === -1) throw new Error('El video ya no existe.')
    const updated: Video = { ...all[index], ...dehydrate(input), updated_at: new Date().toISOString() }
    all[index] = updated
    writeStored(all)
    return hydrate(updated)
  },

  async deleteVideo(video) {
    writeStored(readStored().filter((v) => v.id !== video.id))
    await removeFiles(storagePathsOf(video))
  },

  async setVideoPlaylist(id, playlistId, position) {
    const all = readStored()
    const video = all.find((v) => v.id === id)
    if (!video) throw new Error('El video ya no existe.')
    video.playlist_id = playlistId
    video.playlist_position = position
    writeStored(all)
  },

  async listPlaylists() {
    const sorted = readPlaylists().sort((a, b) => a.created_at.localeCompare(b.created_at))
    return Promise.all(sorted.map(hydratePlaylist))
  },

  async createPlaylist(input) {
    const now = new Date().toISOString()
    const playlist: Playlist = { ...input, cover_url: storedUrl(input.cover_url, input.cover_path), id: uid(), created_at: now, updated_at: now }
    writePlaylists([...readPlaylists(), playlist])
    return hydratePlaylist(playlist)
  },

  async updatePlaylist(id, input) {
    const all = readPlaylists()
    const index = all.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('La lista ya no existe.')
    all[index] = { ...all[index], ...input, cover_url: storedUrl(input.cover_url, input.cover_path), updated_at: new Date().toISOString() }
    writePlaylists(all)
    return hydratePlaylist(all[index])
  },

  async deletePlaylist(id) {
    const playlist = readPlaylists().find((p) => p.id === id)
    writePlaylists(readPlaylists().filter((p) => p.id !== id))
    writeStored(readStored().map((v) => (v.playlist_id === id ? { ...v, playlist_id: null, playlist_position: null } : v)))
    if (playlist?.cover_path) await removeFiles([playlist.cover_path])
  },

  async uploadFile(file, folder, onProgress) {
    const path = buildStoragePath(folder, file)
    // Progreso simulado para que la experiencia sea igual a la de Supabase.
    for (let p = 10; p < 100; p += 15) {
      onProgress?.(p)
      await delay(60)
    }
    await idbPut(path, file)
    onProgress?.(100)
    const url = URL.createObjectURL(file)
    objectUrls.set(path, url)
    return { url, path }
  },

  removeFiles,

  async getSession() {
    return readSession()
  },

  async signIn(email, password) {
    await delay(450)
    if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    const session: AdminSession = { userId: 'demo-admin', email: DEMO_CREDENTIALS.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    authListeners.forEach((l) => l(session))
    return session
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY)
    authListeners.forEach((l) => l(null))
  },

  async changePassword() {
    throw new Error('En modo demo la contraseña es fija. Conecta Supabase para usar tu propia cuenta.')
  },

  onAuthChange(callback) {
    authListeners.add(callback)
    return () => {
      authListeners.delete(callback)
    }
  },
}

/** Restaura el catálogo de ejemplo (útil desde el panel en modo demo). */
export async function resetDemoData() {
  const stored = readStored()
  await Promise.all(stored.flatMap((v) => storagePathsOf(v)).map((p) => idbDelete(p).catch(() => undefined)))
  localStorage.removeItem(VIDEOS_KEY)
  localStorage.removeItem(PLAYLISTS_KEY)
}
