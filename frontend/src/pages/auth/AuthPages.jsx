import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, Building2 } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui/UI'
import useAuthStore from '../../store/authStore'
import styles from './Auth.module.css'

// ── Login ─────────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate()
  const { login, cargando, error, limpiarError } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e) => {
    limpiarError()
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await login(form.email, form.password)
    if (res.ok) navigate('/inventario')
  }

  return (
    <div className={styles.authRoot}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <div className={styles.logoBox}>FS</div>
          <h1 className={styles.authTitle}>Ferre<span>Stock</span></h1>
        </div>
        <p className={styles.authSub}>Inicia sesión en tu cuenta</p>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Correo electrónico"
            icon={Mail}
            type="email"
            name="email"
            placeholder="correo@ferreteria.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Contraseña"
            icon={Lock}
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={cargando}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            Entrar
          </Button>
        </form>

        <p className={styles.authFooter}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className={styles.authLink}>
            Prueba gratis 14 días
          </Link>
        </p>
      </div>
    </div>
  )
}

// ── Register ──────────────────────────────────────────────────────────────
export function RegisterPage() {
  const navigate = useNavigate()
  const { register, cargando, error, limpiarError } = useAuthStore()
  const [form, setForm] = useState({
    nombre_negocio: '', nombre_usuario: '', email: '', password: ''
  })

  const handleChange = (e) => {
    limpiarError()
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await register(
      form.nombre_negocio, form.nombre_usuario, form.email, form.password
    )
    if (res.ok) navigate('/inventario')
  }

  return (
    <div className={styles.authRoot}>
      <div className={styles.authCard}>
        <div className={styles.authLogo}>
          <div className={styles.logoBox}>FS</div>
          <h1 className={styles.authTitle}>Ferre<span>Stock</span></h1>
        </div>
        <p className={styles.authSub}>Crea tu cuenta — 14 días gratis, sin tarjeta</p>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Nombre de tu ferretería"
            icon={Building2}
            name="nombre_negocio"
            placeholder="Ferretería González"
            value={form.nombre_negocio}
            onChange={handleChange}
            required
          />
          <Input
            label="Tu nombre"
            icon={User}
            name="nombre_usuario"
            placeholder="Juan González"
            value={form.nombre_usuario}
            onChange={handleChange}
            required
          />
          <Input
            label="Correo electrónico"
            icon={Mail}
            type="email"
            name="email"
            placeholder="correo@ferreteria.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Contraseña"
            icon={Lock}
            type="password"
            name="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={cargando}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            Crear cuenta gratis
          </Button>
        </form>

        <p className={styles.authFooter}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className={styles.authLink}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
