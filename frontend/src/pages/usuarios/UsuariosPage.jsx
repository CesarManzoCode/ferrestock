import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Shield, User, AlertCircle } from 'lucide-react'
import {
  Button, Badge, Card, CardHeader, CardTitle,
  Modal, Input, Alert, Empty, Spinner
} from '../../components/ui/UI'
import { usuariosService } from '../../services/api'
import useAuthStore from '../../store/authStore'
import styles from './Usuarios.module.css'

const LIMITE = 3

function fmtFecha(iso) {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ── Formulario nuevo usuario ──────────────────────────────────────────────
function FormNuevoUsuario({ onGuardar, onCancelar, cargando, error }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'empleado' })
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onGuardar(form)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}
      <Input
        label="Nombre completo *"
        name="nombre"
        placeholder="Juan Pérez"
        value={form.nombre}
        onChange={handleChange}
        required
        autoFocus
      />
      <Input
        label="Correo electrónico *"
        name="email"
        type="email"
        placeholder="juan@ferreteria.com"
        value={form.email}
        onChange={handleChange}
        required
      />
      <Input
        label="Contraseña *"
        name="password"
        type="password"
        placeholder="Mínimo 8 caracteres"
        value={form.password}
        onChange={handleChange}
        minLength={8}
        required
      />
      <div className={styles.inputWrapper}>
        <label className={styles.label}>Rol *</label>
        <select name="rol" value={form.rol} onChange={handleChange} className={styles.select}>
          <option value="empleado">Empleado — puede consultar y cotizar</option>
          <option value="admin">Administrador — acceso completo</option>
        </select>
        <p className={styles.hint}>
          Los empleados pueden buscar productos y hacer cotizaciones.<br/>
          Los administradores pueden además editar inventario y gestionar usuarios.
        </p>
      </div>
      <div className={styles.formActions}>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={cargando}>Crear usuario</Button>
      </div>
    </form>
  )
}

// ── Modal editar usuario ──────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, onGuardar, onCancelar, cargando, error }) {
  const [rol, setRol] = useState(usuario.rol)
  const [activo, setActivo] = useState(usuario.activo)

  return (
    <div className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}
      <div className={styles.inputWrapper}>
        <label className={styles.label}>Nombre</label>
        <p className={styles.valorFijo}>{usuario.nombre}</p>
      </div>
      <div className={styles.inputWrapper}>
        <label className={styles.label}>Correo</label>
        <p className={styles.valorFijo}>{usuario.email}</p>
      </div>
      <div className={styles.inputWrapper}>
        <label className={styles.label}>Rol</label>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className={styles.select}>
          <option value="empleado">Empleado</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
        />
        <span>Usuario activo</span>
      </label>
      {!activo && (
        <Alert variant="warning">
          Al desactivar este usuario ya no podrá iniciar sesión.
        </Alert>
      )}
      <div className={styles.formActions}>
        <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button
          variant="primary"
          loading={cargando}
          onClick={() => onGuardar({ rol, activo })}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuthStore()
  const esAdmin = usuarioActual?.rol === 'admin'

  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [usuarioEditar, setUsuarioEditar] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await usuariosService.listar()
      setUsuarios(data)
    } catch {
      setError('No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleCrear = async (datos) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await usuariosService.crear(datos)
      setUsuarios((prev) => [...prev, data])
      setModalNuevo(false)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al crear el usuario')
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = async (cambios) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await usuariosService.actualizar(usuarioEditar.id, cambios)
      setUsuarios((prev) => prev.map((u) => u.id === data.id ? data : u))
      setUsuarioEditar(null)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const activos = usuarios.filter((u) => u.activo).length
  const puedeAgregar = activos < LIMITE

  return (
    <div className={styles.page}>
      {/* Banner de límite */}
      <div className={`${styles.limiteBanner} ${!puedeAgregar ? styles.limiteAlcanzado : ''}`}>
        <div className={styles.limiteInfo}>
          <Users size={18} />
          <span>
            <strong>{activos} de {LIMITE}</strong> usuarios activos incluidos en tu plan
          </span>
        </div>
        {!puedeAgregar && (
          <span className={styles.limiteTexto}>
            Límite alcanzado — contáctanos si necesitas más usuarios
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          {esAdmin && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => { setFormError(null); setModalNuevo(true) }}
              disabled={!puedeAgregar}
              title={!puedeAgregar ? `Límite de ${LIMITE} usuarios alcanzado` : ''}
            >
              Agregar usuario
            </Button>
          )}
        </CardHeader>

        {error && (
          <div style={{ padding: '12px 20px' }}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {cargando ? (
          <div className={styles.loadingCenter}><Spinner size={32} /></div>
        ) : usuarios.length === 0 ? (
          <Empty icon={Users} title="Sin usuarios" description="Agrega empleados para que puedan acceder al sistema." />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  {esAdmin && <th>Correo</th>}
                  {esAdmin && <th>Rol</th>}
                  <th>Estado</th>
                  {esAdmin && <th>Último acceso</th>}
                  {esAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={!u.activo ? styles.rowInactivo : ''}>
                    <td>
                      <div className={styles.usuarioCell}>
                        <div className={styles.avatar}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={styles.usuarioNombre}>{u.nombre}</p>
                          {String(u.id) === String(usuarioActual?.id) && (
                            <span className={styles.tuTag}>Tú</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {esAdmin && <td className={styles.tdSec}>{u.email}</td>}
                    {esAdmin && (
                      <td>
                        <div className={styles.rolCell}>
                          {u.rol === 'admin'
                            ? <><Shield size={13} className={styles.iconAdmin} /><span>Administrador</span></>
                            : <><User size={13} className={styles.iconEmpleado} /><span>Empleado</span></>
                          }
                        </div>
                      </td>
                    )}
                    <td>
                      <Badge variant={u.activo ? 'ok' : 'gris'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    {esAdmin && <td className={styles.tdSec}>{fmtFecha(u.ultimo_login)}</td>}
                    {esAdmin && (
                      <td>
                        {String(u.id) !== String(usuarioActual?.id) && (
                          <button
                            className={styles.editBtn}
                            onClick={() => { setFormError(null); setUsuarioEditar(u) }}
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal nuevo usuario */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Agregar usuario" width={460}>
        <FormNuevoUsuario
          onGuardar={handleCrear}
          onCancelar={() => setModalNuevo(false)}
          cargando={guardando}
          error={formError}
        />
      </Modal>

      {/* Modal editar */}
      <Modal
        open={!!usuarioEditar}
        onClose={() => setUsuarioEditar(null)}
        title={`Editar: ${usuarioEditar?.nombre}`}
        width={420}
      >
        {usuarioEditar && (
          <ModalEditarUsuario
            usuario={usuarioEditar}
            onGuardar={handleEditar}
            onCancelar={() => setUsuarioEditar(null)}
            cargando={guardando}
            error={formError}
          />
        )}
      </Modal>
    </div>
  )
}
