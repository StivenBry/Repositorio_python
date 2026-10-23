import { Eye, EyeOff, Info, Loader2, LockKeyhole, Mail, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { FullPageSpinner } from '../../components/States'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { isDemo } from '../../services'
import { DEMO_CREDENTIALS } from '../../services/demoBackend'
import { useNoIndex } from '../../lib/useNoIndex'
import { usePageTitle } from '../../lib/usePageTitle'

export default function AdminLoginPage() {
  usePageTitle('Acceso administrador')
  useNoIndex()
  const { session, loading, signIn } = useAuth()
  const { videos } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  const collage = videos.slice(0, 12)

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* Mosaico de pósters de fondo */}
      <div className="absolute inset-0 -z-10 grid rotate-[-8deg] scale-125 grid-cols-4 gap-3 opacity-35 blur-[2px] sm:grid-cols-6" aria-hidden>
        {collage.concat(collage).map((v, i) =>
          v.thumbnail_url ? <img key={`${v.id}-${i}`} src={v.thumbnail_url} alt="" className="aspect-[2/3] w-full rounded-md object-cover" /> : null,
        )}
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,14,28,0.75),#0b0e1c_70%)]" />

      <div className="animate-scale-in w-full max-w-md">
        <Link to="/" className="mx-auto mb-8 flex w-fit rounded" aria-label="Volver al sitio">
          <Logo size="lg" />
        </Link>
        <form onSubmit={onSubmit} className="card bg-panel/85 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8" noValidate>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold">Panel de administración</h1>
              <p className="text-sm text-muted">Inicia sesión para gestionar el contenido</p>
            </div>
          </div>

          {isDemo && (
            <div className="mb-5 rounded-xl border border-sky-400/25 bg-sky-400/10 p-4 text-sm text-sky-100">
              <p className="flex items-center gap-2 font-semibold">
                <Info className="size-4" /> Modo demo (sin Supabase)
              </p>
              <p className="mt-1 text-sky-100/80">
                Usa <b>{DEMO_CREDENTIALS.email}</b> / <b>{DEMO_CREDENTIALS.password}</b>. Los cambios se guardan solo en este navegador.
              </p>
              <button
                type="button"
                className="mt-2 font-semibold text-sky-300 underline-offset-2 hover:underline"
                onClick={() => {
                  setEmail(DEMO_CREDENTIALS.email)
                  setPassword(DEMO_CREDENTIALS.password)
                }}
              >
                Autocompletar credenciales
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 flex gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}

          <label className="label" htmlFor="email">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" />
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field py-3 pl-10"
              placeholder="admin@tusitio.com"
            />
          </div>

          <label className="label mt-4" htmlFor="password">
            Contraseña
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field py-3 pr-11 pl-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-white/50 transition hover:text-white"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <button type="submit" disabled={submitting || !email || !password} className="btn-primary mt-7 w-full">
            {submitting && <Loader2 className="size-5 animate-spin" />}
            {submitting ? 'Verificando…' : 'Iniciar sesión'}
          </button>
          {!isDemo && <p className="mt-4 text-center text-xs text-muted">Acceso restringido a cuentas autorizadas.</p>}
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted transition hover:text-white">
            ← Volver al sitio
          </Link>
        </p>
      </div>
    </div>
  )
}
