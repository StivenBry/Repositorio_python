import { lazy, Suspense, useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { FullPageSpinner } from './components/States'
import DetailPage from './pages/DetailPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

// El reproductor y el panel se cargan bajo demanda para que el inicio sea rápido.
const WatchPage = lazy(() => import('./pages/WatchPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const MyListPage = lazy(() => import('./pages/MyListPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'))
const AdminPlaylistsPage = lazy(() => import('./pages/admin/AdminPlaylistsPage'))
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminVideoFormPage = lazy(() => import('./pages/admin/AdminVideoFormPage'))

/** Transición suave entre páginas: cada cambio de ruta vuelve a montar el contenedor animado. */
function PageTransition({ fade = false }: { fade?: boolean }) {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return (
    <div key={pathname} className={fade ? 'animate-fade-in' : 'animate-page-in'}>
      <Suspense fallback={<FullPageSpinner />}>
        <Outlet />
      </Suspense>
    </div>
  )
}

function PublicLayout() {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded focus:bg-brand focus:px-4 focus:py-2">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="min-h-dvh">
        <PageTransition />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="video/:id" element={<DetailPage />} />
        <Route path="buscar" element={<SearchPage />} />
        <Route path="categoria/:slug" element={<CategoryPage />} />
        <Route path="mi-lista" element={<MyListPage />} />
        <Route path="privacidad" element={<PrivacyPage />} />
        <Route path="lista/:id" element={<PlaylistPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<PageTransition fade />}>
        <Route path="ver/:id" element={<WatchPage />} />
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="nuevo" element={<AdminVideoFormPage />} />
          <Route path="editar/:id" element={<AdminVideoFormPage />} />
          <Route path="listas" element={<AdminPlaylistsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
