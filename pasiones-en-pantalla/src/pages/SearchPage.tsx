import { Search, SearchX, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdSlot } from '../components/AdSlot'
import { EmptyState } from '../components/States'
import { GridSkeleton, VideoGrid } from '../components/VideoGrid'
import { useCatalog } from '../context/CatalogContext'
import { normalize } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'
import type { Video } from '../types'

/** Cada palabra debe aparecer en el título, la descripción, la categoría o las etiquetas. */
function matches(video: Video, terms: string[], playlistText = '') {
  if (!terms.length) return true
  const haystack = normalize([video.title, video.description, video.category, playlistText, ...video.tags].join(' '))
  return terms.every((t) => haystack.includes(t))
}

export default function SearchPage() {
  usePageTitle('Buscar')
  const { videos, categories, tags, loading, getPlaylist, toEntries } = useCatalog()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const category = params.get('categoria') ?? ''
  const deferredQuery = useDeferredValue(query)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  // Mantiene la URL sincronizada (se puede compartir o volver atrás).
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (query.trim()) next.set('q', query.trim())
      else next.delete('q')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [query, params, setParams])

  const setCategory = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('categoria', value)
    else next.delete('categoria')
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const terms = normalize(deferredQuery).split(/\s+/).filter(Boolean)
    const found = videos.filter((v) => {
      const playlist = getPlaylist(v.playlist_id)
      return (!category || v.category === category) && matches(v, terms, playlist ? `${playlist.title} ${playlist.description}` : '')
    })
    // Los capítulos que coinciden aparecen dentro de su lista, no sueltos.
    return toEntries(found)
  }, [videos, deferredQuery, category, getPlaylist, toEntries])

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
      active ? 'border-white bg-white text-ink' : 'border-white/25 text-white/80 hover:border-white/60 hover:text-white'
    }`

  return (
    <div className="gutter pt-24 lg:pt-32">
      <label className="relative block max-w-3xl">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute top-1/2 left-5 size-6 -translate-y-1/2 text-white/50" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca novelas, series, géneros…"
          className="w-full rounded-full border border-white/15 bg-white/[0.07] py-4 pr-14 pl-14 text-lg text-white placeholder:text-white/40 transition outline-none focus:border-brand/70 focus:bg-white/10 focus:ring-4 focus:ring-brand/20 sm:text-xl [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Borrar búsqueda"
          >
            <X className="size-5" />
          </button>
        )}
      </label>

      <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" className={chip(!category)} onClick={() => setCategory('')}>
          Todas
        </button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className={chip(category === c.name)} onClick={() => setCategory(category === c.name ? '' : c.name)}>
            {c.name}
          </button>
        ))}
      </div>

      {!query && tags.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="mr-1 text-muted">Populares:</span>
          {tags.slice(0, 10).map((t) => (
            <button key={t} type="button" onClick={() => setQuery(t)} className="rounded-md bg-white/5 px-2.5 py-1 text-white/75 transition hover:bg-white/15 hover:text-white">
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        {loading ? (
          <GridSkeleton />
        ) : results.length ? (
          <>
            <p className="mb-5 text-sm text-muted" aria-live="polite">
              {deferredQuery.trim() ? `${results.length} resultado${results.length === 1 ? '' : 's'} para “${deferredQuery.trim()}”` : `${results.length} títulos`}
            </p>
            <VideoGrid entries={results} />
            <AdSlot className="mt-12" format="banner" />
          </>
        ) : (
          <EmptyState icon={SearchX} title="Sin resultados">
            <p>No encontramos títulos para “{deferredQuery.trim()}”. Prueba con otra palabra o revisa la ortografía.</p>
          </EmptyState>
        )}
      </div>
    </div>
  )
}
