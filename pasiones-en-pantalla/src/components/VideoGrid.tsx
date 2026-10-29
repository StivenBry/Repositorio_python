import type { BrowseEntry } from '../context/CatalogContext'
import type { Video } from '../types'
import { EntryCard } from './VideoCard'

/** Cuadrícula de pósters. Con `entries`, las listas aparecen agrupadas en una sola tarjeta. */
export function VideoGrid({ videos = [], entries }: { videos?: Video[]; entries?: BrowseEntry[] }) {
  const items: BrowseEntry[] = entries ?? videos.map((v) => ({ kind: 'video', key: v.id, title: v.title, video: v }))
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-6 sm:grid-cols-4 sm:gap-x-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {items.map((entry, i) => (
        <div key={entry.key} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}>
          <EntryCard entry={entry} showTitle />
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 14 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-6 sm:grid-cols-4 sm:gap-x-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[2/3] rounded-md" />
          <div className="skeleton mt-2 h-3.5 w-3/4 rounded" />
        </div>
      ))}
    </div>
  )
}
