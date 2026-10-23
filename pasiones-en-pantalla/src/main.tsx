import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

// GitHub Pages no conoce las rutas de la SPA: su 404.html redirige /ruta → ?__ruta=ruta
// y aquí se restaura la URL original antes de montar el router.
const pendingRoute = new URLSearchParams(window.location.search).get('__ruta')
if (pendingRoute !== null) {
  window.history.replaceState(null, '', import.meta.env.BASE_URL + pendingRoute.replace(/^\/+/, '') + window.location.hash)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <AuthProvider>
          <CatalogProvider>
            <App />
          </CatalogProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
