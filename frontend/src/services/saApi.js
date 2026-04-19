import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sa_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sa_access_token')
      localStorage.removeItem('sa_refresh_token')
      window.location.href = '/superadmin/login'
    }
    return Promise.reject(error)
  }
)

export const saService = {
  login: (email, password) =>
    axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/auth/login`,
      { email, password }
    ),

  stats: () => api.get('/superadmin/stats'),

  tenants: {
    listar:   (params) => api.get('/superadmin/tenants', { params }),
    obtener:  (id) => api.get(`/superadmin/tenants/${id}`),
    crear:    (data) => api.post('/superadmin/tenants', data),
    actualizar: (id, data) => api.patch(`/superadmin/tenants/${id}`, data),
    suspender:  (id) => api.post(`/superadmin/tenants/${id}/suspender`),
    activar:    (id) => api.post(`/superadmin/tenants/${id}/activar`),
    extenderTrial: (id, dias) =>
      api.post(`/superadmin/tenants/${id}/extender-trial`, null, { params: { dias } }),
  },

  usuarios: {
    listar: (params) => api.get('/superadmin/usuarios', { params }),
  },
}

export default api
