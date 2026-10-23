import { CloudOff, Film } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HeroCarousel, HeroSkeleton } from '../components/HeroCarousel'
import { EmptyState } from '../components/States'
import { LandscapeCard, PosterCard } from '../components/VideoCard'
import { VideoRow } from '../components/VideoRow'
import { useCatalog } from '../context/CatalogContext'
import { formatClock } from '../lib/format'
import { useMyList, useProgress } from '../lib/localStore'
import { usePageTitle } from '../lib/usePageTitle'

export default function HomePage() {
  usePageTitle()
  const { videos, categories, loading, error, refresh } = useCatalog()
  const progress = useProgress()
  const { ids: myListIds } = useMyList()

  const featured = useMemo(() => {
    const picked = videos.filter((v) => v.is_featured)
    return (picked.length ? picked : videos).slice(0, 10)
  }, [videos])

  const continueWatching = useMemo(
    () =>
      videos
        .filter((v) => progress[v.id])
        .sort((a, b) => progress[b.id].at - progress[a.id].at)
        .slice(0, 12),
    [videos, progress],
  )

  const top10 = useMemo(() => videos.filter((v) => v.is_top10).slice(0, 10), [videos])
  const myList = useMemo(() => myListIds.map((id) => videos.find((v) => v.id === id)).filter((v) => v !== undefined), [myListIds, videos])

  if (loading) {
    return (
      <>
        <HeroSkeleton />
        <div className="gutter relative z-10 -mt-24 flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton aspect-[2/3] w-[34vw] shrink-0 rounded-md sm:w-[25vw] md:w-[19vw] lg:w-[14.6vw] xl:w-[12.4vw]" />
          ))}
        </div>
      </>
    )
  }

  if (error) {
    return (
      <div className="gutter pt-32">
        <EmptyState icon={CloudOff} title="No pudimos cargar el catálogo">
          <p>{error}</p>
          <button type="button" className="btn-primary mt-6" onClick={() => void refresh()}>
            Reintentar
          </button>
        </EmptyState>
      </div>
    )
  }

  if (!videos.length) {
    return (
      <div className="gutter pt-32">
        <EmptyState icon={Film} title="Aún no hay videos publicados">
          <p>Entra al panel de administración para subir el primer video.</p>
          <Link to="/admin" className="btn-primary mt-6">
            Ir al panel
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <>
      <HeroCarousel videos={featured} />
      <div className="relative z-10 mt-2 space-y-6 sm:-mt-[16vh] lg:-mt-[19vh] lg:space-y-9">
        {continueWatching.length > 0 && (
          <VideoRow title="Continuar viendo">
            {continueWatching.map((v) => (
              <LandscapeCard
                key={v.id}
                video={v}
                inRow
                to={`/ver/${v.id}`}
                progress={progress[v.id].t / progress[v.id].d}
                subtitle={`Quedan ${formatClock(progress[v.id].d - progress[v.id].t)}`}
              />
            ))}
          </VideoRow>
        )}
        {top10.length > 0 && (
          <VideoRow title="Top 10 más vistos">
            {top10.map((v) => (
              <PosterCard key={v.id} video={v} inRow />
            ))}
          </VideoRow>
        )}
        <VideoRow title="Recién agregados" seeAllHref="/buscar">
          {videos.slice(0, 16).map((v) => (
            <PosterCard key={v.id} video={v} inRow />
          ))}
        </VideoRow>
        {myList.length > 0 && (
          <VideoRow title="Mi lista" seeAllHref="/mi-lista">
            {myList.map((v) => (
              <PosterCard key={v.id} video={v} inRow />
            ))}
          </VideoRow>
        )}
        {categories.map((c) => (
          <VideoRow key={c.slug} title={c.name} seeAllHref={`/categoria/${c.slug}`}>
            {videos
              .filter((v) => v.category === c.name)
              .map((v) => (
                <PosterCard key={v.id} video={v} inRow />
              ))}
          </VideoRow>
        ))}
      </div>
    </>
  )
}
