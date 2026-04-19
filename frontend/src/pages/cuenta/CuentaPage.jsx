import { useState, useEffect } from 'react'
import { User, Building2, Lock, CheckCircle } from 'lucide-react'
import { Button, Input, Alert, Card, CardHeader, CardTitle, Spinner } from '../../components/ui/UI'
import { cuentaService } from '../../services/api'
import styles from './Cuenta.module.css'

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function PlanBadge({ plan, diasRestantes, activo }) {
  if (!activo) return <span className={`${styles.planBadge} ${styles.planSuspendido}`}>Suspendido</span>
  if (plan === 'trial') {
    const vencido = diasRestantes !== null && diasRestantes < 0
    if (vencido) return <span className={`${styles.planBadge} ${styles.planVencido}`}>Trial vencido</span>
    return (
      <span className={`${styles.planBadge} ${styles.planTrial}`}>
        Trial — {diasRestantes ?? '?'} días restantes
      </span>
    )
  }
  return <span className={`${styles.planBadge} ${styles.planActivo}`}>Plan activo</span>
}

export default function CuentaPage() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Sección nombre usuario
  const [nombreEdit, setNombreEdit] = useState(false)
  const [nombreVal, setNombreVal] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [okNombre, setOkNombre] = useState(false)

  // Sección nombre negocio
  const [negocioEdit, setNegocioEdit] = useState(false)
  const [negocioVal, setNegocioVal] = useState('')
  const [guardandoNegocio, setGuardandoNegocio] = useState(false)
  const [okNegocio, setOkNegocio] = useState(false)

  // Sección contraseña
  const [pwForm, setPwForm] = useState({ password_actual: '', password_nueva: '', confirmar: '' })
  const [guardandoPw, setGuardandoPw] = useState(false)
  const [errorPw, setErrorPw] = useState(null)
  const [okPw, setOkPw] = useState(false)

  useEffect(() => {
    cuentaService.obtener()
      .then(({ data }) => {
        setDatos(data)
        setNombreVal(data.usuario.nombre)
        setNegocioVal(data.negocio.nombre)
      })
      .catch(() => setError('No se pudieron cargar los datos de tu cuenta.'))
      .finally(() => setCargando(false))
  }, [])

  const handleGuardarNombre = async () => {
    if (!nombreVal.trim()) return
    setGuardandoNombre(true)
    try {
      const { data } = await cuentaService.actualizarUsuario({ nombre: nombreVal.trim() })
      setDatos((d) => ({ ...d, usuario: data }))
      setNombreEdit(false)
      setOkNombre(true)
      setTimeout(() => setOkNombre(false), 3000)
    } catch {
      setError('Error al guardar el nombre.')
    } finally {
      setGuardandoNombre(false)
    }
  }

  const handleGuardarNegocio = async () => {
    if (!negocioVal.trim()) return
    setGuardandoNegocio(true)
    try {
      await cuentaService.actualizarNegocio({ nombre: negocioVal.trim() })
      setDatos((d) => ({ ...d, negocio: { ...d.negocio, nombre: negocioVal.trim() } }))
      setNegocioEdit(false)
      setOkNegocio(true)
      setTimeout(() => setOkNegocio(false), 3000)
    } catch {
      setError('Error al guardar el nombre del negocio.')
    } finally {
      setGuardandoNegocio(false)
    }
  }

  const handleCambiarPassword = async (e) => {
    e.preventDefault()
    setErrorPw(null)
    if (pwForm.password_nueva !== pwForm.confirmar) {
      setErrorPw('Las contraseñas nuevas no coinciden')
      return
    }
    if (pwForm.password_nueva.length < 8) {
      setErrorPw('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setGuardandoPw(true)
    try {
      await cuentaService.cambiarPassword({
        password_actual: pwForm.password_actual,
        password_nueva: pwForm.password_nueva,
      })
      setPwForm({ password_actual: '', password_nueva: '', confirmar: '' })
      setOkPw(true)
      setTimeout(() => setOkPw(false), 4000)
    } catch (err) {
      setErrorPw(err.response?.data?.detail || 'Error al cambiar la contraseña')
    } finally {
      setGuardandoPw(false)
    }
  }

  if (cargando) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spinner size={36} />
    </div>
  )

  if (error) return (
    <div style={{ padding: 24 }}><Alert variant="error">{error}</Alert></div>
  )

  const { usuario, negocio } = datos

  return (
    <div className={styles.page}>

      {/* ── Datos personales ─────────────────────────────────────────────── */}
      <Card accent="naranja">
        <CardHeader>
          <div className={styles.seccionTitulo}>
            <User size={18} className={styles.seccionIcono} />
            <CardTitle>Mi perfil</CardTitle>
          </div>
        </CardHeader>
        <div className={styles.cardBody}>
          {/* Nombre */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Nombre</label>
            {nombreEdit ? (
              <div className={styles.campoEdit}>
                <Input
                  value={nombreVal}
                  onChange={(e) => setNombreVal(e.target.value)}
                  autoFocus
                />
                <Button variant="primary" size="sm" loading={guardandoNombre} onClick={handleGuardarNombre}>
                  Guardar
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setNombreEdit(false); setNombreVal(usuario.nombre) }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className={styles.campoValor}>
                <span>{usuario.nombre}</span>
                {okNombre && <CheckCircle size={16} className={styles.iconOk} />}
                <button className={styles.editarLink} onClick={() => setNombreEdit(true)}>Editar</button>
              </div>
            )}
          </div>

          {/* Correo (solo lectura) */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Correo electrónico</label>
            <div className={styles.campoValor}>
              <span>{usuario.email}</span>
              <span className={styles.tag}>No editable</span>
            </div>
          </div>

          {/* Rol */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Rol</label>
            <div className={styles.campoValor}>
              <span className={styles.rolBadge}>
                {usuario.rol === 'admin' ? 'Administrador' : 'Empleado'}
              </span>
            </div>
          </div>

          {/* Último acceso */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Miembro desde</label>
            <span className={styles.campoTexto}>{fmtFecha(usuario.creado_en)}</span>
          </div>
        </div>
      </Card>

      {/* ── Datos del negocio ─────────────────────────────────────────────── */}
      <Card accent="azul">
        <CardHeader>
          <div className={styles.seccionTitulo}>
            <Building2 size={18} className={styles.seccionIcono} />
            <CardTitle>Mi ferretería</CardTitle>
          </div>
        </CardHeader>
        <div className={styles.cardBody}>
          {/* Nombre del negocio */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Nombre del negocio</label>
            {negocioEdit && usuario.rol === 'admin' ? (
              <div className={styles.campoEdit}>
                <Input
                  value={negocioVal}
                  onChange={(e) => setNegocioVal(e.target.value)}
                  autoFocus
                />
                <Button variant="primary" size="sm" loading={guardandoNegocio} onClick={handleGuardarNegocio}>
                  Guardar
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setNegocioEdit(false); setNegocioVal(negocio.nombre) }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className={styles.campoValor}>
                <span>{negocio.nombre}</span>
                {okNegocio && <CheckCircle size={16} className={styles.iconOk} />}
                {usuario.rol === 'admin' && (
                  <button className={styles.editarLink} onClick={() => setNegocioEdit(true)}>Editar</button>
                )}
              </div>
            )}
          </div>

          {/* Plan */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Plan actual</label>
            <PlanBadge
              plan={negocio.plan}
              diasRestantes={negocio.dias_trial_restantes}
              activo={negocio.activo}
            />
          </div>

          {negocio.plan === 'trial' && negocio.dias_trial_restantes !== null && (
            <div className={styles.trialBox}>
              {negocio.dias_trial_restantes > 0 ? (
                <p>
                  Tu prueba gratuita vence el <strong>{fmtFecha(negocio.trial_hasta)}</strong>.
                  Para continuar usando FerreStock después, contáctanos por WhatsApp o correo.
                </p>
              ) : (
                <p>
                  Tu periodo de prueba ha vencido. Contáctanos para activar tu suscripción
                  y seguir usando FerreStock sin interrupciones.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Cambiar contraseña ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className={styles.seccionTitulo}>
            <Lock size={18} className={styles.seccionIcono} />
            <CardTitle>Cambiar contraseña</CardTitle>
          </div>
        </CardHeader>
        <div className={styles.cardBody}>
          <form onSubmit={handleCambiarPassword} className={styles.pwForm}>
            {errorPw && <Alert variant="error">{errorPw}</Alert>}
            {okPw && <Alert variant="success">Contraseña actualizada correctamente.</Alert>}
            <Input
              label="Contraseña actual"
              type="password"
              placeholder="••••••••"
              value={pwForm.password_actual}
              onChange={(e) => setPwForm((f) => ({ ...f, password_actual: e.target.value }))}
              required
            />
            <div className={styles.pwRow}>
              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={pwForm.password_nueva}
                onChange={(e) => setPwForm((f) => ({ ...f, password_nueva: e.target.value }))}
                required
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="Repite la nueva contraseña"
                value={pwForm.confirmar}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmar: e.target.value }))}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" loading={guardandoPw}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </div>
      </Card>

    </div>
  )
}
