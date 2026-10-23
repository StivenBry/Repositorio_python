import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_BUCKET, SUPABASE_URL } from '../lib/config'
import type { AdminSession, Playlist, Video } from '../types'
import { buildStoragePath, storagePathsOf, type Backend } from './backend'

/** Traduce los errores más comunes de Supabase a mensajes accionables. */
export function friendlyError(error: unknown): Error {
  const message = (error as { message?: string })?.message ?? String(error)
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return new Error('Correo o contraseña incorrectos.')
  if (lower.includes('email not confirmed')) return new Error('Debes confirmar el correo del usuario en Supabase (Authentication → Users).')
  if (lower.includes('row-level security') || lower.includes('permission denied') || lower.includes('unauthorized'))
    return new Error('Tu usuario no tiene permisos de administrador. Agrégalo a la tabla "admins" (ver README).')
  if (lower.includes('bucket not found')) return new Error(`No existe el bucket "${SUPABASE_BUCKET}". Ejecuta supabase/schema.sql.`)
  if (lower.includes('payload too large') || lower.includes('maximum allowed size') || lower.includes('exceeded the maximum'))
    return new Error('El archivo supera el tamaño máximo permitido por tu proyecto de Supabase. Aumenta el límite del bucket o usa un enlace externo.')
  if (lower.includes('mime type') || lower.includes('invalid_mime'))
    return new Error('Tipo de archivo no permitido por el bucket. Usa MP4/WebM para video y JPG/PNG/WebP para imágenes.')
  if (lower.includes('failed to fetch') || lower.includes('networkerror'))
    return new Error('No se pudo conectar con Supabase. Revisa tu conexión y las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.')
  if (lower.includes('playlist') && (lower.includes('does not exist') || lower.includes('could not find')))
    return new Error('Faltan las listas de reproducción en la base de datos. Ejecuta de nuevo supabase/schema.sql.')
  if (lower.includes('relation') && lower.includes('does not exist'))
    return new Error('La tabla "videos" no existe. Ejecuta supabase/schema.sql en el SQL Editor de Supabase.')
  return new Error(message)
}

const toAdmin = (session: Session | null): AdminSession | null =>
  session?.user ? { userId: session.user.id, email: session.user.email ?? '' } : null

/**
 * Sube con XMLHttpRequest al mismo endpoint que usa supabase-js para poder
 * informar el porcentaje de avance (fetch todavía no expone progreso de subida).
 */
function uploadWithProgress(path: string, file: File, accessToken: string, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodedPath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }
      let message = `Error ${xhr.status} al subir el archivo`
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        message = body.message || body.error || message
      } catch {
        /* respuesta no JSON */
      }
      if (xhr.status === 413) message = 'Payload too large'
      reject(friendlyError(message))
    }
    xhr.onerror = () => reject(friendlyError('Failed to fetch'))
    const form = new FormData()
    form.append('cacheControl', '31536000')
    form.append('', file)
    xhr.send(form)
  })
}

export function createSupabaseBackend(client: SupabaseClient): Backend {
  const bucket = () => client.storage.from(SUPABASE_BUCKET)

  async function removeFiles(paths: string[]) {
    if (!paths.length) return
    // Si falla (p. ej. archivo ya borrado) no bloquea la operación principal.
    const { error } = await bucket().remove(paths)
    if (error) console.warn('No se pudieron borrar algunos archivos de Storage:', error.message)
  }

  async function assertAdmin() {
    const { data, error } = await client.rpc('is_admin')
    if (error) throw friendlyError(error)
    if (!data) throw new Error('Esta cuenta no tiene permisos de administrador. Agrégala a la tabla "admins" (ver README).')
  }

  return {
    mode: 'supabase',

    async listVideos() {
      const { data, error } = await client.from('videos').select('*').order('published_at', { ascending: false })
      if (error) throw friendlyError(error)
      return (data ?? []) as Video[]
    },

    async createVideo(input) {
      const { data, error } = await client.from('videos').insert(input).select().single()
      if (error) throw friendlyError(error)
      return data as Video
    },

    async updateVideo(id, input) {
      const { data, error } = await client.from('videos').update(input).eq('id', id).select().single()
      if (error) throw friendlyError(error)
      return data as Video
    },

    async deleteVideo(video) {
      const { error } = await client.from('videos').delete().eq('id', video.id)
      if (error) throw friendlyError(error)
      await removeFiles(storagePathsOf(video))
    },

    async setVideoPlaylist(id, playlistId, position) {
      const { error } = await client.from('videos').update({ playlist_id: playlistId, playlist_position: position }).eq('id', id)
      if (error) throw friendlyError(error)
    },

    async listPlaylists() {
      const { data, error } = await client.from('playlists').select('*').order('created_at', { ascending: true })
      if (error) throw friendlyError(error)
      return (data ?? []) as Playlist[]
    },

    async createPlaylist(input) {
      const { data, error } = await client.from('playlists').insert(input).select().single()
      if (error) throw friendlyError(error)
      return data as Playlist
    },

    async updatePlaylist(id, input) {
      const { data, error } = await client.from('playlists').update(input).eq('id', id).select().single()
      if (error) throw friendlyError(error)
      return data as Playlist
    },

    async deletePlaylist(id) {
      const { data, error } = await client.from('playlists').delete().eq('id', id).select('cover_path')
      if (error) throw friendlyError(error)
      await removeFiles((data ?? []).map((row) => row.cover_path as string | null).filter((p): p is string => Boolean(p)))
    },

    async uploadFile(file, folder, onProgress) {
      const { data } = await client.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      const path = buildStoragePath(folder, file)
      await uploadWithProgress(path, file, token, onProgress)
      return { path, url: bucket().getPublicUrl(path).data.publicUrl }
    },

    removeFiles,

    async getSession() {
      const { data } = await client.auth.getSession()
      const session = toAdmin(data.session)
      if (!session) return null
      try {
        await assertAdmin()
        return session
      } catch {
        return null
      }
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw friendlyError(error)
      try {
        await assertAdmin()
      } catch (e) {
        await client.auth.signOut()
        throw e
      }
      return toAdmin(data.session)!
    },

    async signOut() {
      await client.auth.signOut()
    },

    async changePassword(newPassword) {
      const { error } = await client.auth.updateUser({ password: newPassword })
      if (!error) return
      const lower = error.message.toLowerCase()
      if (lower.includes('different from the old')) throw new Error('La nueva contraseña debe ser distinta de la actual.')
      if (lower.includes('at least') || lower.includes('weak')) throw new Error('La contraseña es demasiado débil: usa al menos 8 caracteres combinando letras y números.')
      throw friendlyError(error)
    },

    onAuthChange(callback) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return
        // Supabase recomienda no llamar a su API dentro de este callback.
        setTimeout(() => {
          if (!session) return callback(null)
          client
            .rpc('is_admin')
            .then(({ data: isAdmin }) => callback(isAdmin ? toAdmin(session) : null), () => callback(null))
        }, 0)
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
