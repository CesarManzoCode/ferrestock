import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Tag, DollarSign, Hash, Info } from 'lucide-react'
import {
  Button, Card, CardHeader, CardTitle,
  Modal, Input, Alert, Empty, Spinner
} from '../../components/ui/UI'
import { camposService } from '../../services/api'
import useAuthStore from '../../store/authStore'
import styles from './Campos.module.css'

const ROL_INFO = {
  precio: {
    label: 'Precio alternativo',
    desc: 'Aparece como opción de precio en cotizaciones (ej: Precio Mayoreo, Precio Familiar)',
    icon: DollarSign,
    color: 'naranja',
  },
  codigo: {
    label: 'Código / ID',
    desc: 'Se incluye en la búsqueda del inventario. Útil para códigos de proveedor o internos.',
    icon: Hash,
    color: 'azul',
  },
  info: {
    label: 'Información extra',
    desc: 'Dato visible en el detalle del producto, sin comportamiento especial.',
    icon: Info,
    color: 'gris',
  },
}

function RolBadge({ rol }) {
  const info = ROL_INFO[rol] || ROL_INFO.info
  const Icon = info.icon
  return (
    <span className={`${styles.rolBadge} ${styles[`rol_${info.color}`]}`}>
      <Icon size={12} />
      {info.label}
    </span>
  )
}

function FormNuevoCampo({ onGuardar, onCancelar, cargando, error }) {
  const [form, setForm] = useState({ etiqueta: '', rol: 'info', tipo: 'texto' })

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    // nombre_campo se genera del etiqueta en el backend
    onGuardar({
      nombre_campo: form.etiqueta,
      etiqueta: form.etiqueta,
      rol: form.rol,
      tipo: form.tipo,
      obligatorio: false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        label="Nombre del campo *"
        name="etiqueta"
        placeholder="Ej: Precio Mayoreo, Código Truper, Ubicación en bodega"
        value={form.etiqueta}
        onChange={handleChange}
        required
        autoFocus
      />

      <div className={styles.inputWrapper}>
        <label className={styles.label}>Tipo de campo *</label>
        <select name="tipo" value={form.tipo} onChange={handleChange} className={styles.select}>
          <option value="texto">Texto</option>
          <option value="numero">Número</option>
        </select>
      </div>

      <div className={styles.inputWrapper}>
        <label className={styles.label}>Rol del campo *</label>
        <select name="rol" value={form.rol} onChange={handleChange} className={styles.select}>
          <option value="info">Información extra — solo visible en el detalle</option>
          <option value="precio">Precio alternativo — aparece en cotizaciones</option>
          <option value="codigo">Código / ID — se incluye en la búsqueda</option>
        </select>
        <p className={styles.hint}>{ROL_INFO[form.rol].desc}</p>
      </div>

      <div className={styles.formActions}>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={cargando}>Crear campo</Button>
      </div>
    </form>
  )
}

export default function CamposPage() {
  const { usuario } = useAuthStore()
  const esAdmin = usuario?.rol === 'admin'

  const [campos, setCampos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState(null)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await camposService.listar()
      setCampos(data)
    } catch {
      setError('No se pudieron cargar los campos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleCrear = async (datos) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await camposService.crear(datos)
      setCampos((prev) => [...prev, data])
      setModalNuevo(false)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al crear el campo')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!confirmarEliminar) return
    setEliminando(confirmarEliminar.id)
    try {
      await camposService.eliminar(confirmarEliminar.id)
      setCampos((prev) => prev.filter((c) => c.id !== confirmarEliminar.id))
      setConfirmarEliminar(null)
    } catch {
      setError('No se pudo eliminar el campo.')
    } finally {
      setEliminando(null)
    }
  }

  const porRol = {
    precio: campos.filter((c) => c.rol === 'precio'),
    codigo: campos.filter((c) => c.rol === 'codigo'),
    info:   campos.filter((c) => c.rol === 'info'),
  }

  return (
    <div className={styles.page}>
      {/* Explicación */}
      <div className={styles.intro}>
        <p className={styles.introTexto}>
          Los campos personalizados te permiten agregar información extra a tus productos:
          precios alternativos para mayoreo, códigos de proveedor, o cualquier dato específico
          de tu negocio. Una vez creados, los encontrarás disponibles en el inventario y las cotizaciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campos personalizados</CardTitle>
          {esAdmin && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setFormError(null); setModalNuevo(true) }}>
              Nuevo campo
            </Button>
          )}
        </CardHeader>

        {error && <div style={{ padding: '12px 20px' }}><Alert variant="error">{error}</Alert></div>}

        {cargando ? (
          <div className={styles.loadingCenter}><Spinner size={32} /></div>
        ) : campos.length === 0 ? (
          <Empty
            icon={Tag}
            title="Sin campos personalizados"
            description="Crea campos para agregar información extra a tus productos, como precios mayoreo o códigos de proveedor."
            action={esAdmin && (
              <Button variant="primary" icon={Plus} onClick={() => setModalNuevo(true)}>
                Crear primer campo
              </Button>
            )}
          />
        ) : (
          <div className={styles.camposLista}>
            {(['precio', 'codigo', 'info']).map((rol) => {
              if (porRol[rol].length === 0) return null
              const info = ROL_INFO[rol]
              const Icon = info.icon
              return (
                <div key={rol} className={styles.grupoRol}>
                  <div className={`${styles.grupoHeader} ${styles[`grupoHeader_${info.color}`]}`}>
                    <Icon size={16} />
                    <span>{info.label}</span>
                    <span className={styles.grupoCount}>{porRol[rol].length}</span>
                  </div>
                  <div className={styles.grupoItems}>
                    {porRol[rol].map((campo) => (
                      <div key={campo.id} className={styles.campoItem}>
                        <div className={styles.campoInfo}>
                          <p className={styles.campoEtiqueta}>{campo.etiqueta}</p>
                          <p className={styles.campoMeta}>
                            Clave: <code>{campo.nombre_campo}</code>
                            {' · '}
                            Tipo: {campo.tipo}
                          </p>
                        </div>
                        <RolBadge rol={campo.rol} />
                        {esAdmin && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setConfirmarEliminar(campo)}
                            disabled={eliminando === campo.id}
                            title="Eliminar campo"
                          >
                            {eliminando === campo.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Modal nuevo */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo campo personalizado" width={480}>
        <FormNuevoCampo
          onGuardar={handleCrear}
          onCancelar={() => setModalNuevo(false)}
          cargando={guardando}
          error={formError}
        />
      </Modal>

      {/* Confirmar eliminar */}
      <Modal open={!!confirmarEliminar} onClose={() => setConfirmarEliminar(null)} title="Eliminar campo" width={400}>
        {confirmarEliminar && (
          <div className={styles.confirmDelete}>
            <p>
              ¿Eliminar el campo <strong>{confirmarEliminar.etiqueta}</strong>?
            </p>
            <p className={styles.confirmSub}>
              El campo desaparecerá de la configuración, pero los datos ya guardados en productos
              existentes no se borrarán automáticamente.
            </p>
            <div className={styles.formActions}>
              <Button variant="outline" onClick={() => setConfirmarEliminar(null)}>Cancelar</Button>
              <Button variant="danger" loading={!!eliminando} onClick={handleEliminar}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
