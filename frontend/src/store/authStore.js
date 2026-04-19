import { create } from 'zustand'
import { authService } from '../services/api'

const useAuthStore = create((set) => ({
  usuario: null,
  cargando: false,
  error: null,

  inicializar: () => {
    // Leer token guardado al cargar la app
    const token = localStorage.getItem('access_token')
    const usuario = localStorage.getItem('usuario')
    if (token && usuario) {
      set({ usuario: JSON.parse(usuario) })
    }
  },

  login: async (email, password) => {
    set({ cargando: true, error: null })
    try {
      const { data } = await authService.login({ email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      // Decodificar payload del JWT para obtener datos básicos
      const payload = JSON.parse(atob(data.access_token.split('.')[1]))
      const usuario = { id: payload.sub, rol: payload.rol, tenant_id: payload.tenant_id }
      localStorage.setItem('usuario', JSON.stringify(usuario))
      set({ usuario, cargando: false })
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar sesión'
      set({ error: msg, cargando: false })
      return { ok: false, error: msg }
    }
  },

  register: async (nombre_negocio, nombre_usuario, email, password) => {
    set({ cargando: true, error: null })
    try {
      const { data } = await authService.register({ nombre_negocio, nombre_usuario, email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      const payload = JSON.parse(atob(data.access_token.split('.')[1]))
      const usuario = { id: payload.sub, rol: payload.rol, tenant_id: payload.tenant_id }
      localStorage.setItem('usuario', JSON.stringify(usuario))
      set({ usuario, cargando: false })
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al registrarse'
      set({ error: msg, cargando: false })
      return { ok: false, error: msg }
    }
  },

  logout: () => {
    localStorage.clear()
    set({ usuario: null, error: null })
  },

  limpiarError: () => set({ error: null }),
}))

export default useAuthStore
