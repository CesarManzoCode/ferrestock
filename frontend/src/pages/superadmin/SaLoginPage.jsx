import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui/UI'
import useSaStore from '../../store/saStore'
import styles from './SA.module.css'

export default function SaLoginPage() {
  const navigate = useNavigate()
  const { login, cargando, error, limpiarError } = useSaStore()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e) => {
    limpiarError()
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await login(form.email, form.password)
    if (res.ok) navigate('/superadmin')
  }

  return (
    <div className={styles.loginRoot}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginBadge}>SA</div>
          <div>
            <h1 className={styles.loginTitle}>Panel de Administración</h1>
            <p className={styles.loginSub}>FerreStock — Acceso restringido</p>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <Input
            label="Correo"
            icon={Mail}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
          />
          <Input
            label="Contraseña"
            icon={Lock}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            loading={cargando}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Entrar al panel
          </Button>
        </form>
      </div>
    </div>
  )
}
