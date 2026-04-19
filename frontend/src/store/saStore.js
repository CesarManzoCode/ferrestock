import { create } from 'zustand'
import { saService } from '../services/saApi'

const useSaStore = create((set) => ({
  usuario: null,
  cargando: false,
  error: null,

  inicializar: () => {
    const token = localStorage.getItem('sa_access_token')
    const usuario = localStorage.getItem('sa_usuario')
    if (token && usuario) {
      const u = JSON.parse(usuario)
      if (u.rol === 'superadmin') set({ usuario: u })
    }
  },

  login: async (email, password) => {
    set({ cargando: true, error: null })
    try {
      const { data } = await saService.login(email, password)
      const payload = JSON.parse(atob(data.access_token.split('.')[1]))

      if (payload.rol !== 'superadmin') {
        set({ error: 'No tienes permisos de superadmin', cargando: false })
        return { ok: false }
      }

      localStorage.setItem('sa_access_token', data.access_token)
      localStorage.setItem('sa_refresh_token', data.refresh_token)
      const usuario = { id: payload.sub, rol: payload.rol, tenant_id: payload.tenant_id }
      localStorage.setItem('sa_usuario', JSON.stringify(usuario))
      set({ usuario, cargando: false })
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Correo o contraseña incorrectos'
      set({ error: msg, cargando: false })
      return { ok: false }
    }
  },

  logout: () => {
    localStorage.removeItem('sa_access_token')
    localStorage.removeItem('sa_refresh_token')
    localStorage.removeItem('sa_usuario')
    set({ usuario: null })
  },

  limpiarError: () => set({ error: null }),
}))

export default useSaStore
