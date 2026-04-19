import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import { LoginPage, RegisterPage } from './pages/auth/AuthPages'
import InventarioPage from './pages/inventario/InventarioPage'
import CotizacionesPage from './pages/cotizaciones/CotizacionesPage'
import ImportarPage from './pages/importar/ImportarPage'

function Placeholder({ titulo }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-sec)' }}>
      <h2 style={{ color: 'var(--texto)', marginBottom: 8 }}>{titulo}</h2>
      <p>Próximamente disponible.</p>
    </div>
  )
}

function Privado({ children }) {
  const usuario = useAuthStore((s) => s.usuario)
  if (!usuario) return <Navigate to="/login" replace />
  return children
}

function Publico({ children }) {
  const usuario = useAuthStore((s) => s.usuario)
  if (usuario) return <Navigate to="/inventario" replace />
  return children
}

export default function App() {
  const inicializar = useAuthStore((s) => s.inicializar)
  useEffect(() => { inicializar() }, [inicializar])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Publico><LoginPage /></Publico>} />
        <Route path="/registro" element={<Publico><RegisterPage /></Publico>} />
        <Route path="/" element={<Privado><Layout /></Privado>}>
          <Route index element={<Navigate to="/inventario" replace />} />
          <Route path="inventario"   element={<InventarioPage />} />
          <Route path="cotizaciones" element={<CotizacionesPage />} />
          <Route path="importar"     element={<ImportarPage />} />
          <Route path="usuarios"     element={<Placeholder titulo="Usuarios" />} />
          <Route path="cuenta"       element={<Placeholder titulo="Mi cuenta" />} />
        </Route>
        <Route path="*" element={<Navigate to="/inventario" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
