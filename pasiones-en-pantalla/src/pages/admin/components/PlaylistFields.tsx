import { isValidVideoUrl } from '../../../lib/media'
import { backend } from '../../../services'
import type { Playlist, PlaylistInput } from '../../../types'
import { emptyMedia, MediaField, mediaFrom, type MediaState } from './MediaField'

export interface PlaylistDraft {
  title: string
  description: string
  cover: MediaState
}

export const draftFrom = (playlist?: Playlist): PlaylistDraft => ({
  title: playlist?.title ?? '',
  description: playlist?.description ?? '',
  cover: playlist ? mediaFrom(playlist.cover_url, playlist.cover_path) : emptyMedia(),
})

/** Devuelve un mensaje de error o null si el borrador es válido. */
export function validateDraft(draft: PlaylistDraft): string | null {
  if (!draft.title.trim()) return 'Escribe el nombre de la lista.'
  if (draft.cover.mode === 'url' && draft.cover.link.trim() && !isValidVideoUrl(draft.cover.link)) return 'El enlace de la portada no es válido.'
  return null
}

export const draftHasCoverUpload = (draft: PlaylistDraft) => draft.cover.mode === 'upload' && Boolean(draft.cover.file)

/**
 * Crea o actualiza una lista subiendo antes su portada si es un archivo nuevo.
 * Si falla, no deja la portada huérfana; si se reemplazó, borra la anterior.
 */
export async function savePlaylistDraft(draft: PlaylistDraft, existing?: Playlist, onProgress?: (p: number) => void): Promise<Playlist> {
  let cover_url: string | null = null
  let cover_path: string | null = null
  let uploaded: string | null = null
  if (draft.cover.mode === 'url') {
    cover_url = draft.cover.link.trim() || null
  } else if (draft.cover.file) {
    const result = await backend.uploadFile(draft.cover.file, 'playlists', onProgress)
    cover_url = result.url
    cover_path = result.path
    uploaded = result.path
  } else if (draft.cover.stored) {
    cover_url = draft.cover.stored.url
    cover_path = draft.cover.stored.path
  }

  const input: PlaylistInput = { title: draft.title.trim(), description: draft.description.trim(), cover_url, cover_path }
  try {
    const saved = existing ? await backend.updatePlaylist(existing.id, input) : await backend.createPlaylist(input)
    if (existing?.cover_path && existing.cover_path !== cover_path) await backend.removeFiles([existing.cover_path])
    return saved
  } catch (e) {
    if (uploaded) await backend.removeFiles([uploaded]).catch(() => undefined)
    throw e
  }
}

interface Props {
  value: PlaylistDraft
  onChange: (draft: PlaylistDraft) => void
  error?: string | null
  /** Oculta el campo de nombre (cuando el formulario lo pide aparte). */
  hideTitle?: boolean
  idPrefix: string
}

export function PlaylistFields({ value, onChange, error, hideTitle = false, idPrefix }: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        {!hideTitle && (
          <div>
            <label className="label" htmlFor={`${idPrefix}-title`}>
              Nombre de la lista <span className="text-brand">*</span>
            </label>
            <input
              id={`${idPrefix}-title`}
              value={value.title}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              maxLength={120}
              className="field"
              placeholder="Ej. Tierra de Pasión · Temporada 1"
            />
          </div>
        )}
        <div>
          <label className="label flex justify-between" htmlFor={`${idPrefix}-description`}>
            Descripción <span className="text-xs font-normal text-muted">{value.description.length}/600</span>
          </label>
          <textarea
            id={`${idPrefix}-description`}
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            maxLength={600}
            rows={4}
            className="field resize-y leading-relaxed"
            placeholder="De qué trata la lista. Se muestra en su página."
          />
        </div>
        {error && <p className="text-xs font-medium text-red-300">{error}</p>}
      </div>
      <MediaField
        kind="image"
        aspect="wide"
        label="Portada de la lista (16:9)"
        value={value.cover}
        onChange={(cover) => onChange({ ...value, cover })}
        hint="Opcional. Si no subes una, se usa la imagen del primer video."
      />
    </div>
  )
}
