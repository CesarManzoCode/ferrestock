import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Package, FileText, Upload, Users, Settings,
  ChevronLeft, ChevronRight, Menu, X, LogOut
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { label: 'Inventario',     path: '/inventario',  Icon: Package },
  { label: 'Cotizaciones',   path: '/cotizaciones', Icon: FileText },
  { label: 'Importar Excel', path: '/importar',    Icon: Upload },
]

const CONFIG_ITEMS = [
  { label: 'Usuarios',   path: '/usuarios',  Icon: Users },
  { label: 'Mi cuenta',  path: '/cuenta',    Icon: Settings },
]

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { logout, usuario } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>FS</div>
          {!collapsed && (
            <span className={styles.logoText}>
              Ferre<span className={styles.logoAccent}>Stock</span>
            </span>
          )}
          {/* Cerrar en mobile */}
          <button className={styles.mobileClose} onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className={styles.nav}>
          {!collapsed && <p className={styles.sectionLabel}>Principal</p>}
          {NAV_ITEMS.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className={styles.navIcon} />
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}

          {!collapsed && <p className={styles.sectionLabel} style={{ marginTop: 8 }}>Configuración</p>}
          {collapsed && <div className={styles.divider} />}
          {CONFIG_ITEMS.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className={styles.navIcon} />
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.navItem}
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={20} className={styles.navIcon} />
            {!collapsed && <span className={styles.navLabel}>Cerrar sesión</span>}
          </button>

          {/* Toggle collapse - solo desktop */}
          <button
            className={`${styles.toggleBtn} ${styles.desktopOnly}`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed
              ? <ChevronRight size={18} />
              : <><ChevronLeft size={18} /><span>Colapsar</span></>
            }
          </button>
        </div>
      </aside>
    </>
  )
}
