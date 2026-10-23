import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { Logo } from './Logo'

export function Footer() {
  const { categories } = useCatalog()
  return (
    <footer className="gutter mt-20 border-t border-line pt-12 pb-10 text-sm text-muted">
      <div className="flex flex-col gap-10 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <Logo size="sm" />
          <p className="mt-4 leading-relaxed">
            Novelas, series y películas que se viven con el corazón. Drama, romance y suspenso cuando quieras.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          <div>
            <p className="mb-3 font-semibold text-white">Explorar</p>
            <ul className="space-y-2">
              <li><Link className="transition hover:text-white" to="/">Inicio</Link></li>
              <li><Link className="transition hover:text-white" to="/buscar">Buscar</Link></li>
              <li><Link className="transition hover:text-white" to="/mi-lista">Mi lista</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-white">Categorías</p>
            <ul className="space-y-2">
              {categories.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link className="transition hover:text-white" to={`/categoria/${c.slug}`}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Pasiones en Pantalla. Todos los derechos reservados.</p>
        <Link to="/privacidad" className="transition hover:text-white">
          Privacidad
        </Link>
      </div>
    </footer>
  )
}
