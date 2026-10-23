import type { AdminSession, Playlist, PlaylistInput, UploadFolder, UploadResult, Video, VideoInput } from '../types'

export type ProgressFn = (percent: number) => void

/** Contrato común para Supabase y para el modo demo (localStorage + IndexedDB). */
export interface Backend {
  mode: 'supabase' | 'demo'
  listVideos(): Promise<Video[]>
  createVideo(input: VideoInput): Promise<Video>
  updateVideo(id: string, input: VideoInput): Promise<Video>
  deleteVideo(video: Video): Promise<void>
  /** Cambia solo la lista y la posición de un video (para reordenar). */
  setVideoPlaylist(id: string, playlistId: string | null, position: number | null): Promise<void>
  listPlaylists(): Promise<Playlist[]>
  createPlaylist(input: PlaylistInput): Promise<Playlist>
  updatePlaylist(id: string, input: PlaylistInput): Promise<Playlist>
  /** Borra la lista; sus videos se conservan, sin lista. */
  deletePlaylist(id: string): Promise<void>
  uploadFile(file: File, folder: UploadFolder, onProgress?: ProgressFn): Promise<UploadResult>
  removeFiles(paths: string[]): Promise<void>

  getSession(): Promise<AdminSession | null>
  /** Inicia sesión y verifica que la cuenta sea administradora. */
  signIn(email: string, password: string): Promise<AdminSession>
  signOut(): Promise<void>
  changePassword(newPassword: string): Promise<void>
  onAuthChange(callback: (session: AdminSession | null) => void): () => void
}

/** crypto.randomUUID solo existe en HTTPS/localhost; en http://IP-local se usa un respaldo. */
export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`

/** Nombre de archivo seguro y único: videos/2026/10/k2j3h4-mi-video.mp4 */
export function buildStoragePath(folder: UploadFolder, file: File) {
  const now = new Date()
  const ext = (file.name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? file.type.split('/')[1] ?? 'bin').toLowerCase()
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'archivo'
  const id = uid().slice(0, 8)
  return `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${id}-${base}.${ext}`
}

export function storagePathsOf(video: Pick<Video, 'video_path' | 'thumbnail_path' | 'backdrop_path'>) {
  return [video.video_path, video.thumbnail_path, video.backdrop_path].filter((p): p is string => Boolean(p))
}
