import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Package, RefreshCw } from 'lucide-react'
import {
  Button, Badge, Card, CardHeader, CardTitle,
  Modal, Input, Alert, Empty, Spinner
} from '../../components/ui/UI'
import { productosService } from '../../services/api'
import styles from './Inventario.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────
function getBadge(existencias) {
  if (existencias <= 0) return { variant: 'bajo', label: 'Sin stock' }
  if (existencias <= 10) return { variant: 'bajo', label: 'Stock bajo' }
  if (existencias <= 30) return { variant: 'medio', label: 'Stock medio' }
  return { variant: 'ok', label: 'OK' }
}

const FORM_VACIO = { nombre: '', precio: '', existencias: '', descripcion: '' }

// ── Formulario de producto ────────────────────────────────────────────────
function FormProducto({ inicial, onGuardar, onCancelar, cargando, error }) {
  const [form, setForm] = useState(inicial || FORM_VACIO)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onGuardar({
      nombre: form.nombre.trim(),
      precio: parseFloat(form.precio),
      existencias: parseFloat(form.existencias) || 0,
      descripcion: form.descripcion.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}
      <Input
        label="Nombre del producto *"
        name="nombre"
        placeholder="Ej: Tornillo hexagonal 1/4 x 1 pulg"
        value={form.nombre}
        onChange={handleChange}
        required
        autoFocus
      />
      <div className={styles.formRow}>
        <Input
          label="Precio ($) *"
          name="precio"
          type="number"
          placeholder="0.00"
          min="0"
          step="0.01"
          value={form.precio}
          onChange={handleChange}
          required
        />
        <Input
          label="Existencias"
          name="existencias"
          type="number"
          placeholder="0"
          min="0"
          step="any"
          value={form.existencias}
          onChange={handleChange}
        />
      </div>
      <Input
        label="Descripción"
        name="descripcion"
        placeholder="Descripción opcional"
        value={form.descripcion}
        onChange={handleChange}
      />
      <div className={styles.formActions}>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={cargando}>
          {inicial ? 'Guardar cambios' : 'Agregar producto'}
        </Button>
      </div>
    </form>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function InventarioPage() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState(null) // null = sin búsqueda activa
  const [buscando, setBuscando] = useState(false)
  const busquedaTimer = useRef(null)

  const [modalAgregar, setModalAgregar] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [productoEliminar, setProductoEliminar] = useState(null)

  // Cargar lista completa
  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await productosService.listar({ limit: 200 })
      setProductos(data)
    } catch {
      setError('No se pudo cargar el inventario. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  // Búsqueda fuzzy con debounce
  useEffect(() => {
    clearTimeout(busquedaTimer.current)
    if (!busqueda.trim()) { setResultados(null); return }
    if (busqueda.trim().length < 2) { setResultados([]); return }

    busquedaTimer.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await productosService.buscar(busqueda.trim())
        setResultados(data)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)

    return () => clearTimeout(busquedaTimer.current)
  }, [busqueda])

  const lista = resultados !== null ? resultados : productos

  // CRUD
  const handleAgregar = async (datos) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await productosService.crear(datos)
      setProductos((p) => [data, ...p])
      setModalAgregar(false)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = async (datos) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await productosService.actualizar(productoEditar.id, datos)
      setProductos((p) => p.map((x) => (x.id === data.id ? data : x)))
      setProductoEditar(null)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    setGuardando(true)
    try {
      await productosService.eliminar(productoEliminar.id)
      setProductos((p) => p.filter((x) => x.id !== productoEliminar.id))
      setProductoEliminar(null)
    } catch {
      setError('No se pudo eliminar el producto.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiNaranja}`}>
            <Package size={22} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Total productos</p>
            <p className={styles.kpiValue}>{productos.length.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiAlerta}`}>
            <Package size={22} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Sin stock o stock bajo</p>
            <p className={styles.kpiValue}>
              {productos.filter((p) => p.existencias <= 10).length}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <div className={styles.headerRight}>
            {/* Buscador */}
            <div className={styles.searchBox}>
              {buscando
                ? <Spinner size={16} />
                : <Search size={16} className={styles.searchIcon} />
              }
              <input
                className={styles.searchInput}
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={styles.searchClear} onClick={() => setBusqueda('')}>
                  ✕
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={cargarProductos}
              title="Actualizar"
            />
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => { setFormError(null); setModalAgregar(true) }}
            >
              Agregar
            </Button>
          </div>
        </CardHeader>

        {error && (
          <div style={{ padding: '12px 20px' }}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {cargando ? (
          <div className={styles.loadingCenter}>
            <Spinner size={32} />
            <p>Cargando inventario...</p>
          </div>
        ) : lista.length === 0 ? (
          <Empty
            icon={Package}
            title={busqueda ? 'Sin resultados' : 'Sin productos aún'}
            description={
              busqueda
                ? `No se encontró "${busqueda}" en el inventario.`
                : 'Agrega tu primer producto o importa tu lista de precios en Excel.'
            }
            action={
              !busqueda && (
                <Button variant="primary" icon={Plus} onClick={() => setModalAgregar(true)}>
                  Agregar producto
                </Button>
              )
            }
          />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className={styles.hideM}>Descripción</th>
                  <th>Precio</th>
                  <th>Existencias</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const badge = getBadge(p.existencias)
                  return (
                    <tr key={p.id} onDoubleClick={() => setProductoEditar(p)}>
                      <td className={styles.tdNombre}>{p.nombre}</td>
                      <td className={`${styles.tdSec} ${styles.hideM}`}>
                        {p.descripcion || '—'}
                      </td>
                      <td className={styles.tdPrecio}>
                        ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td>{Number(p.existencias).toLocaleString()}</td>
                      <td>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className={styles.tdActions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => { setFormError(null); setProductoEditar(p) }}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          onClick={() => setProductoEliminar(p)}
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal agregar */}
      <Modal open={modalAgregar} onClose={() => setModalAgregar(false)} title="Agregar producto">
        <FormProducto
          onGuardar={handleAgregar}
          onCancelar={() => setModalAgregar(false)}
          cargando={guardando}
          error={formError}
        />
      </Modal>

      {/* Modal editar */}
      <Modal
        open={!!productoEditar}
        onClose={() => setProductoEditar(null)}
        title="Editar producto"
      >
        {productoEditar && (
          <FormProducto
            inicial={productoEditar}
            onGuardar={handleEditar}
            onCancelar={() => setProductoEditar(null)}
            cargando={guardando}
            error={formError}
          />
        )}
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal
        open={!!productoEliminar}
        onClose={() => setProductoEliminar(null)}
        title="Eliminar producto"
        width={400}
      >
        {productoEliminar && (
          <div className={styles.confirmDelete}>
            <p>
              ¿Estás seguro de que quieres eliminar{' '}
              <strong>{productoEliminar.nombre}</strong>?
            </p>
            <p className={styles.confirmSub}>
              El producto dejará de aparecer en el inventario. Esta acción no se puede deshacer.
            </p>
            <div className={styles.formActions}>
              <Button variant="outline" onClick={() => setProductoEliminar(null)}>
                Cancelar
              </Button>
              <Button variant="danger" loading={guardando} onClick={handleEliminar}>
                Sí, eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
