import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={styles.root}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        {/* Topbar mobile hamburger */}
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className={styles.topbarBrand}>
            <span className={styles.brandName}>Ferre<span>Stock</span></span>
          </div>
        </header>

        {/* Página actual */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
