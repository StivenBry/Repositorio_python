import { Database, ExternalLink, FlaskConical, KeyRound, LayoutDashboard, LogOut, Plus } from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { FullPageSpinner } from '../../components/States'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { isDemo } from '../../services'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'

const tab = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
  }`

/** Ruta protegida: solo entra una sesión de administrador. */
export default function AdminLayout() {
  const { session, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [changingPassword, setChangingPassword] = useState(false)

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  const logout = async () => {
    await signOut()
    toast.info('Sesión cerrada')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#161b36,#0b0e1c_60%)]">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/admin" className="shrink-0" aria-label="Panel">
            <Logo size="sm" />
          </NavLink>
          <span className="hidden rounded-md bg-white/5 px-2 py-1 text-xs font-semibold tracking-wider text-muted uppercase md:inline">Admin</span>
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavLink to="/admin" end className={tab}>
              <LayoutDashboard className="size-4" /> Videos
            </NavLink>
            <NavLink to="/admin/nuevo" className={tab}>
              <Plus className="size-4" /> Nuevo video
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold lg:inline-flex ${
                isDemo ? 'bg-sky-400/10 text-sky-300' : 'bg-emerald-400/10 text-emerald-300'
              }`}
              title={isDemo ? 'Sin variables de Supabase: los datos se guardan en este navegador' : 'Conectado a Supabase'}
            >
              {isDemo ? <FlaskConical className="size-3.5" /> : <Database className="size-3.5" />}
              {isDemo ? 'Modo demo' : 'Supabase conectado'}
            </span>
            <span className="hidden max-w-48 truncate text-sm text-muted md:inline">{session.email}</span>
            {!isDemo && (
              <button type="button" onClick={() => setChangingPassword(true)} className="btn-ghost px-3 py-2 text-sm" title="Cambiar contraseña">
                <KeyRound className="size-4" />
                <span className="hidden lg:inline">Contraseña</span>
              </button>
            )}
            <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-sm" title="Ver sitio público">
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">Ver sitio</span>
            </a>
            <button type="button" onClick={logout} className="btn-ghost px-3 py-2 text-sm" title="Cerrar sesión">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-line px-4 py-2 sm:hidden">
          <NavLink to="/admin" end className={tab}>
            <LayoutDashboard className="size-4" /> Videos
          </NavLink>
          <NavLink to="/admin/nuevo" className={tab}>
            <Plus className="size-4" /> Nuevo video
          </NavLink>
        </nav>
      </header>
      {isDemo && (
        <div className="border-b border-sky-400/15 bg-sky-400/[0.07] px-4 py-2 text-center text-xs text-sky-200 sm:text-sm">
          Modo demo: los cambios se guardan solo en este navegador. Configura Supabase (ver README) para publicarlos para todos.
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <Outlet />
      </main>
      {changingPassword && <ChangePasswordDialog onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
