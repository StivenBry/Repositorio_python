import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/States'
import { GridSkeleton, VideoGrid } from '../components/VideoGrid'
import { useCatalog } from '../context/CatalogContext'
import { useMyList } from '../lib/localStore'
import { usePageTitle } from '../lib/usePageTitle'

export default function MyListPage() {
  usePageTitle('Mi lista')
  const { videos, loading } = useCatalog()
  const { ids } = useMyList()
  const list = ids.map((id) => videos.find((v) => v.id === id)).filter((v) => v !== undefined)

  return (
    <div className="gutter pt-24 lg:pt-32">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Mi lista</h1>
      <p className="mt-2 text-muted">Tus títulos guardados en este dispositivo.</p>
      <div className="mt-10">
        {loading ? (
          <GridSkeleton count={7} />
        ) : list.length ? (
          <VideoGrid videos={list} />
        ) : (
          <EmptyState icon={Heart} title="Tu lista está vacía">
            <p>Toca “Mi lista” en la ficha de cualquier título para guardarlo aquí.</p>
            <Link to="/" className="btn-primary mt-6">
              Descubrir títulos
            </Link>
          </EmptyState>
        )}
      </div>
    </div>
  )
}
