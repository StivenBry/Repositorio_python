import { Film } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/States'
import { GridSkeleton, VideoGrid } from '../components/VideoGrid'
import { useCatalog } from '../context/CatalogContext'
import { usePageTitle } from '../lib/usePageTitle'

type Sort = 'recent' | 'az' | 'top'

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const { videos, categories, loading } = useCatalog()
  const [sort, setSort] = useState<Sort>('recent')
  const category = categories.find((c) => c.slug === slug)
  usePageTitle(category?.name ?? 'Categoría')

  const list = useMemo(() => {
    const items = videos.filter((v) => v.category === category?.name)
    if (sort === 'az') return [...items].sort((a, b) => a.title.localeCompare(b.title, 'es'))
    if (sort === 'top') return [...items].sort((a, b) => Number(b.is_top10) - Number(a.is_top10))
    return items
  }, [videos, category, sort])

  return (
    <div className="gutter pt-24 lg:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">Categoría</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{category?.name ?? (loading ? '' : 'No encontrada')}</h1>
          {category && <p className="mt-2 text-muted">{category.count} títulos</p>}
        </div>
        {category && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Ordenar por
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field w-auto py-2">
              <option value="recent">Más recientes</option>
              <option value="az">Título (A–Z)</option>
              <option value="top">Top 10 primero</option>
            </select>
          </label>
        )}
      </div>
      <div className="mt-10">
        {loading ? (
          <GridSkeleton />
        ) : category ? (
          <VideoGrid videos={list} />
        ) : (
          <EmptyState icon={Film} title="Esta categoría no existe">
            <Link to="/buscar" className="btn-primary mt-4">
              Explorar el catálogo
            </Link>
          </EmptyState>
        )}
      </div>
    </div>
  )
}
