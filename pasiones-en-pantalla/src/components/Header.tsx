import { ChevronDown, Menu, Search, User, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { Logo } from './Logo'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `transition-colors duration-200 hover:text-white ${isActive ? 'text-white font-medium' : 'text-white/70'}`

export function Header() {
  const { categories, playlists, playlistItems } = useCatalog()
  const visiblePlaylists = playlists.filter((p) => playlistItems(p.id).length > 0)
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cierra menús al navegar.
  useEffect(() => {
    setMenuOpen(false)
    setDropdownOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!dropdownOpen) return
    const onDown = (e: PointerEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDropdownOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

  const topCategories = categories.slice(0, 3)
  const solid = scrolled || menuOpen

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        solid ? 'bg-ink/95 shadow-lg shadow-black/30 backdrop-blur-md' : 'bg-gradient-to-b from-black/75 via-black/30 to-transparent'
      }`}
    >
      <div className="gutter flex h-16 items-center gap-6 lg:h-[5.5rem] xl:gap-14">
        <Link to="/" className="shrink-0 rounded outline-offset-4" aria-label="Pasiones en Pantalla, inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-9 text-[1.15rem] lg:flex" aria-label="Principal">
          <div className="relative" ref={dropdownRef} onPointerLeave={(e) => e.pointerType === 'mouse' && setDropdownOpen(false)}>
            <button
              type="button"
              className={`flex items-center gap-2 ${location.pathname === '/' ? 'text-white/90' : 'text-white/70'} transition hover:text-white`}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              onClick={() => setDropdownOpen((o) => !o)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setDropdownOpen(true)}
            >
              Inicio
              <ChevronDown className={`size-5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 pt-3" role="menu">
                <div className="animate-scale-in w-64 origin-top-left overflow-hidden rounded-xl border border-line bg-panel/95 py-2 shadow-2xl shadow-black/60 backdrop-blur-md">
                  <DropdownItem to="/">Inicio</DropdownItem>
                  <DropdownItem to="/buscar">Explorar todo</DropdownItem>
                  <DropdownItem to="/mi-lista">Mi lista</DropdownItem>
                  {categories.length > 0 && <div className="mx-4 my-2 border-t border-line" />}
                  {categories.map((c) => (
                    <DropdownItem key={c.slug} to={`/categoria/${c.slug}`}>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-xs text-muted">{c.count}</span>
                    </DropdownItem>
                  ))}
                  {visiblePlaylists.length > 0 && (
                    <>
                      <p className="mx-4 mt-2 border-t border-line pt-3 pb-1 text-xs font-semibold tracking-widest text-muted uppercase">Listas</p>
                      {visiblePlaylists.map((p) => (
                        <DropdownItem key={p.id} to={`/lista/${p.id}`}>
                          <span className="flex-1 truncate">{p.title}</span>
                          <span className="text-xs text-muted">{playlistItems(p.id).length}</span>
                        </DropdownItem>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {topCategories.map((c) => (
            <NavLink key={c.slug} to={`/categoria/${c.slug}`} className={navLink}>
              {c.name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 sm:gap-4 lg:gap-6">
          <Link
            to="/mi-lista"
            className="hidden rounded-full border-2 border-transparent px-4 py-1.5 text-[0.95rem] font-medium transition [background:linear-gradient(#0b0e1c,#0b0e1c)_padding-box,linear-gradient(100deg,#f26a21,#e8323e)_border-box] hover:[background:linear-gradient(#1a1f38,#1a1f38)_padding-box,linear-gradient(100deg,#ff8a3d,#ff4a55)_border-box] sm:inline-flex lg:px-5 lg:py-2 lg:text-base"
          >
            Mi lista
          </Link>
          <Link to="/buscar" className="icon-btn size-10 bg-white/15 lg:size-12" aria-label="Buscar">
            <Search className="size-5 lg:size-6" />
          </Link>
          <Link to="/admin" className="icon-btn size-10 bg-white/15 lg:size-12" aria-label="Panel de administración">
            <User className="size-5 fill-white lg:size-6" />
          </Link>
          <button
            type="button"
            className="icon-btn size-10 lg:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="animate-fade-in gutter max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line pt-2 pb-6 lg:hidden" aria-label="Menú móvil">
          <MobileLink to="/">Inicio</MobileLink>
          <MobileLink to="/buscar">Explorar todo</MobileLink>
          <MobileLink to="/mi-lista">Mi lista</MobileLink>
          {categories.length > 0 && <p className="mt-4 mb-1 text-xs font-semibold tracking-widest text-muted uppercase">Categorías</p>}
          {categories.map((c) => (
            <MobileLink key={c.slug} to={`/categoria/${c.slug}`}>
              {c.name} <span className="text-sm text-muted">({c.count})</span>
            </MobileLink>
          ))}
          {visiblePlaylists.length > 0 && <p className="mt-4 mb-1 text-xs font-semibold tracking-widest text-muted uppercase">Listas</p>}
          {visiblePlaylists.map((p) => (
            <MobileLink key={p.id} to={`/lista/${p.id}`}>
              {p.title} <span className="text-sm text-muted">({playlistItems(p.id).length})</span>
            </MobileLink>
          ))}
        </nav>
      )}
    </header>
  )
}

function DropdownItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-[0.95rem] text-white/80 transition hover:bg-white/10 hover:text-white">
      {children}
    </Link>
  )
}

function MobileLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block rounded-lg px-3 py-3 text-lg transition ${isActive ? 'bg-white/10 font-semibold text-white' : 'text-white/80 hover:bg-white/5'}`
      }
    >
      {children}
    </NavLink>
  )
}
