import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
})

// Inyectar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh automático si expira el token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/auth/refresh`,
            { refresh_token: refresh }
          )
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
}

// ── Productos ─────────────────────────────────────────────────────────────
export const productosService = {
  listar: (params) => api.get('/productos', { params }),
  buscar: (q, limite = 20) => api.get('/productos/buscar', { params: { q, limite } }),
  obtener: (id) => api.get(`/productos/${id}`),
  crear: (data) => api.post('/productos', data),
  actualizar: (id, data) => api.patch(`/productos/${id}`, data),
  eliminar: (id) => api.delete(`/productos/${id}`),
  previewExcel: (file, fila_inicio = 1) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/productos/importar/preview?fila_inicio=${fila_inicio}`, fd)
  },
  confirmarImportacion: (file, mapeo, camposExtra, fila_inicio = 1) => {
    const fd = new FormData()
    fd.append('file', file)
    const params = new URLSearchParams({
      fila_inicio,
      mapeo: JSON.stringify(mapeo),
      ...(camposExtra.length ? { campos_extra: JSON.stringify(camposExtra) } : {}),
    })
    return api.post(`/productos/importar/confirmar?${params}`, fd)
  },
}

// ── Cotizaciones ──────────────────────────────────────────────────────────
export const cotizacionesService = {
  listar: (params) => api.get('/cotizaciones', { params }),
  obtener: (id) => api.get(`/cotizaciones/${id}`),
  crear: (data) => api.post('/cotizaciones', data),
  cambiarEstado: (id, estado) => api.patch(`/cotizaciones/${id}/estado`, null, { params: { estado } }),
  generarPdf: (id) =>
    api.post(`/cotizaciones/${id}/pdf`, null, { responseType: 'blob' }),
  eliminar: (id) => api.delete(`/cotizaciones/${id}`),
}

export default api
