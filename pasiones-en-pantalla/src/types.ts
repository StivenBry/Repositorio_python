export interface Video {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  /** URL reproducible: archivo (MP4/WebM), HLS (.m3u8), YouTube, Vimeo o Google Drive. */
  video_url: string
  /** Ruta dentro del bucket si el video se subió a Storage (para poder borrarlo). */
  video_path: string | null
  /** Póster vertical 2:3 que se usa en las filas y la búsqueda. */
  thumbnail_url: string | null
  thumbnail_path: string | null
  /** Imagen horizontal 16:9 para el carrusel principal y la ficha. */
  backdrop_url: string | null
  backdrop_path: string | null
  age_rating: string | null
  /** Cinta destacada, p. ej. "Nuevos episodios" o "Estreno". */
  ribbon: string | null
  duration_seconds: number | null
  is_featured: boolean
  is_top10: boolean
  is_exclusive: boolean
  /** Lista de reproducción a la que pertenece (capítulos de una novela, una colección…). */
  playlist_id: string | null
  /** Orden dentro de la lista, empezando en 1. */
  playlist_position: number | null
  published_at: string
  created_at: string
  updated_at: string
}

export type VideoInput = Omit<Video, 'id' | 'created_at' | 'updated_at'>

export interface Playlist {
  id: string
  title: string
  description: string
  /** Portada horizontal 16:9 de la lista. */
  cover_url: string | null
  /** Ruta en el bucket si la portada se subió a Storage. */
  cover_path: string | null
  created_at: string
  updated_at: string
}

export type PlaylistInput = Pick<Playlist, 'title' | 'description' | 'cover_url' | 'cover_path'>

export type UploadFolder = 'videos' | 'thumbnails' | 'backdrops' | 'playlists'

export interface UploadResult {
  url: string
  path: string
}

export interface AdminSession {
  userId: string
  email: string
}
