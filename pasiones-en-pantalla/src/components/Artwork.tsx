import { useState } from 'react'

const GRADIENTS = [
  'from-[#5a1a3c] via-[#2b1240] to-[#0b0e1c]',
  'from-[#7a2a12] via-[#3a1020] to-[#0b0e1c]',
  'from-[#123a52] via-[#18203f] to-[#0b0e1c]',
  'from-[#4a3a12] via-[#2a1a12] to-[#0b0e1c]',
  'from-[#3a1260] via-[#1a1240] to-[#0b0e1c]',
]

const pick = (title: string) => GRADIENTS[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]

interface Props {
  src: string | null
  title: string
  className?: string
  /** Muestra el título sobre el degradado cuando no hay imagen. */
  showFallbackTitle?: boolean
  eager?: boolean
}

/** Imagen con carga diferida y un póster de respaldo elegante si falta o falla. */
export function Artwork({ src, title, className = '', showFallbackTitle = true, eager = false }: Props) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!src || failed) {
    return (
      <div className={`flex items-end bg-gradient-to-br p-3 ${pick(title)} ${className}`}>
        {showFallbackTitle && (
          <span className="font-display text-lg leading-tight font-bold text-white/90 drop-shadow sm:text-xl">{title}</span>
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={title}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  )
}
