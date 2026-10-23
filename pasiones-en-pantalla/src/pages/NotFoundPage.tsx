import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/States'
import { usePageTitle } from '../lib/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Página no encontrada')
  return (
    <div className="gutter pt-32">
      <EmptyState icon={Compass} title="Esta página no existe">
        <p>Puede que el enlace esté roto o que la página se haya movido.</p>
        <Link to="/" className="btn-primary mt-6">
          Volver al inicio
        </Link>
      </EmptyState>
    </div>
  )
}
