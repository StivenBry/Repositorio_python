import type { Video } from '../types'
import { PosterCard } from './VideoCard'

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-6 sm:grid-cols-4 sm:gap-x-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {videos.map((v, i) => (
        <div key={v.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}>
          <PosterCard video={v} showTitle />
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
