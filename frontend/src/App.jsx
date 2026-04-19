import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useSaStore from './store/saStore'
import Layout from './components/layout/Layout'
import { LoginPage, RegisterPage } from './pages/auth/AuthPages'
import InventarioPage from './pages/inventario/InventarioPage'
import CotizacionesPage from './pages/cotizaciones/CotizacionesPage'
import ImportarPage from './pages/importar/ImportarPage'
import SaLoginPage from './pages/superadmin/SaLoginPage'
import SaDashboard from './pages/superadmin/SaDashboard'

// ── Guards app principal ───────────────────────────────────────────────────
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

// ── Guards superadmin ──────────────────────────────────────────────────────
function SaPrivado({ children }) {
  const usuario = useSaStore((s) => s.usuario)
  if (!usuario) return <Navigate to="/superadmin/login" replace />
  return children
}
function SaPublico({ children }) {
  const usuario = useSaStore((s) => s.usuario)
  if (usuario) return <Navigate to="/superadmin" replace />
  return children
}

function Placeholder({ titulo }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-sec)' }}>
      <h2 style={{ color: 'var(--texto)', marginBottom: 8 }}>{titulo}</h2>
      <p>Próximamente disponible.</p>
    </div>
  )
}

export default function App() {
  const inicializar = useAuthStore((s) => s.inicializar)
  const saInicializar = useSaStore((s) => s.inicializar)

  useEffect(() => {
    inicializar()
    saInicializar()
  }, [inicializar, saInicializar])

  return (
    <BrowserRouter>
      <Routes>
        {/* ── App principal ── */}
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

        {/* ── Panel superadmin ── */}
        <Route path="/superadmin/login" element={<SaPublico><SaLoginPage /></SaPublico>} />
        <Route path="/superadmin" element={<SaPrivado><SaDashboard /></SaPrivado>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/inventario" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
