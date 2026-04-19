import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, FileText, Download, Search, Trash2 } from 'lucide-react'
import {
  Button, Badge, Card, CardHeader, CardTitle,
  Modal, Input, Alert, Empty, Spinner
} from '../../components/ui/UI'
import { cotizacionesService, productosService } from '../../services/api'
import styles from './Cotizaciones.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────
const ESTADO_BADGE = {
  borrador:  { variant: 'gris',    label: 'Borrador' },
  enviada:   { variant: 'default', label: 'Enviada' },
  aceptada:  { variant: 'ok',      label: 'Aceptada' },
  cancelada: { variant: 'bajo',    label: 'Cancelada' },
}

function fmtPeso(n) {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ── Buscador de productos dentro del formulario ───────────────────────────
function BuscadorProducto({ onSeleccionar }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    if (q.trim().length < 2) { setResultados([]); return }
    timer.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await productosService.buscar(q.trim(), 10)
        setResultados(data)
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [q])

  const seleccionar = (p) => {
    onSeleccionar(p)
    setQ('')
    setResultados([])
  }

  return (
    <div className={styles.buscadorWrap}>
      <div className={styles.buscadorInput}>
        {buscando ? <Spinner size={15} /> : <Search size={15} className={styles.searchIcon} />}
        <input
          placeholder="Buscar producto del inventario..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      {resultados.length > 0 && (
        <ul className={styles.dropdown}>
          {resultados.map((p) => (
            <li key={p.id} className={styles.dropdownItem} onClick={() => seleccionar(p)}>
              <span className={styles.dropNombre}>{p.nombre}</span>
              <span className={styles.dropPrecio}>{fmtPeso(p.precio)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Formulario nueva cotización ───────────────────────────────────────────
function FormCotizacion({ onGuardar, onCancelar, cargando, error }) {
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', email: '' })
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([])

  const agregarProducto = (p) => {
    setItems((prev) => {
      const existe = prev.find((i) => i.producto_id === p.id)
      if (existe) {
        return prev.map((i) =>
          i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, {
        producto_id: p.id,
        nombre_producto: p.nombre,
        precio_unitario: p.precio,
        cantidad: 1,
      }]
    })
  }

  const actualizarItem = (idx, campo, valor) => {
    setItems((prev) =>
      prev.map((item, i) => i === idx ? { ...item, [campo]: valor } : item)
    )
  }

  const quitarItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx))

  const total = items.reduce(
    (sum, i) => sum + (Number(i.precio_unitario) * Number(i.cantidad)), 0
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    onGuardar({
      cliente_nombre: cliente.nombre || null,
      cliente_telefono: cliente.telefono || null,
      cliente_email: cliente.email || null,
      notas: notas || null,
      items: items.map((i) => ({
        ...i,
        precio_unitario: Number(i.precio_unitario),
        cantidad: Number(i.cantidad),
      })),
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <Alert variant="error">{error}</Alert>}

      {/* Datos del cliente */}
      <div className={styles.seccion}>
        <p className={styles.seccionLabel}>Datos del cliente (opcional)</p>
        <div className={styles.formRow}>
          <Input
            label="Nombre"
            placeholder="Nombre del cliente"
            value={cliente.nombre}
            onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))}
          />
          <Input
            label="Teléfono"
            placeholder="55 1234 5678"
            value={cliente.telefono}
            onChange={(e) => setCliente((c) => ({ ...c, telefono: e.target.value }))}
          />
        </div>
      </div>

      {/* Productos */}
      <div className={styles.seccion}>
        <p className={styles.seccionLabel}>Productos *</p>
        <BuscadorProducto onSeleccionar={agregarProducto} />

        {items.length > 0 && (
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cant.</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className={styles.itemNombre}>{item.nombre_producto}</td>
                  <td>
                    <input
                      type="number"
                      className={styles.itemInput}
                      value={item.precio_unitario}
                      min="0"
                      step="0.01"
                      onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className={styles.itemInput}
                      value={item.cantidad}
                      min="1"
                      step="any"
                      onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td className={styles.itemSubtotal}>
                    {fmtPeso(Number(item.precio_unitario) * Number(item.cantidad))}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => quitarItem(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {items.length === 0 && (
          <p className={styles.emptyItems}>
            Busca y selecciona productos del inventario para agregarlos.
          </p>
        )}
      </div>

      {/* Total */}
      {items.length > 0 && (
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalValue}>{fmtPeso(total)}</span>
        </div>
      )}

      {/* Notas */}
      <Input
        label="Notas"
        placeholder="Condiciones, vigencia, observaciones..."
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
      />

      <div className={styles.formActions}>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button
          type="submit"
          variant="primary"
          loading={cargando}
          disabled={items.length === 0}
        >
          Crear cotización
        </Button>
      </div>
    </form>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [descargando, setDescargando] = useState(null)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [modalNueva, setModalNueva] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await cotizacionesService.listar({ limit: 100 })
      setCotizaciones(data)
    } catch {
      setError('No se pudieron cargar las cotizaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleCrear = async (datos) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await cotizacionesService.crear(datos)
      setCotizaciones((prev) => [data, ...prev])
      setModalNueva(false)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al crear la cotización')
    } finally {
      setGuardando(false)
    }
  }

  const handleDescargarPdf = async (id) => {
    setDescargando(id)
    try {
      const { data } = await cotizacionesService.generarPdf(id)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `cotizacion-${id.toString().padStart(4, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el PDF.')
    } finally {
      setDescargando(null)
    }
  }

  const handleEliminar = async () => {
    setGuardando(true)
    try {
      await cotizacionesService.eliminar(confirmarEliminar.id)
      setCotizaciones((prev) => prev.filter((c) => c.id !== confirmarEliminar.id))
      setConfirmarEliminar(null)
    } catch {
      setError('No se pudo eliminar la cotización.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={styles.page}>
      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones</CardTitle>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => { setFormError(null); setModalNueva(true) }}
          >
            Nueva cotización
          </Button>
        </CardHeader>

        {error && (
          <div style={{ padding: '12px 20px' }}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {cargando ? (
          <div className={styles.loadingCenter}><Spinner size={32} /></div>
        ) : cotizaciones.length === 0 ? (
          <Empty
            icon={FileText}
            title="Sin cotizaciones aún"
            description="Crea tu primera cotización seleccionando productos del inventario."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setModalNueva(true)}>
                Nueva cotización
              </Button>
            }
          />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th className={styles.hideM}>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className={styles.hideM}>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => {
                  const bd = ESTADO_BADGE[c.estado] || ESTADO_BADGE.borrador
                  return (
                    <tr key={c.id}>
                      <td className={styles.tdFolio}>
                        #{String(c.id).padStart(4, '0')}
                      </td>
                      <td>{c.cliente_nombre || <span className={styles.tdSec}>Cliente general</span>}</td>
                      <td className={`${styles.tdSec} ${styles.hideM}`}>
                        {c.items?.length ?? 0} producto(s)
                      </td>
                      <td className={styles.tdTotal}>{fmtPeso(c.total)}</td>
                      <td><Badge variant={bd.variant}>{bd.label}</Badge></td>
                      <td className={`${styles.tdSec} ${styles.hideM}`}>
                        {c.creado_en ? fmtFecha(c.creado_en) : '—'}
                      </td>
                      <td className={styles.tdActions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleDescargarPdf(c.id)}
                          disabled={descargando === c.id}
                          title="Descargar PDF"
                        >
                          {descargando === c.id
                            ? <Spinner size={14} />
                            : <Download size={15} />
                          }
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          onClick={() => setConfirmarEliminar(c)}
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

      {/* Modal nueva cotización */}
      <Modal
        open={modalNueva}
        onClose={() => setModalNueva(false)}
        title="Nueva cotización"
        width={640}
      >
        <FormCotizacion
          onGuardar={handleCrear}
          onCancelar={() => setModalNueva(false)}
          cargando={guardando}
          error={formError}
        />
      </Modal>

      {/* Confirmar eliminar */}
      <Modal
        open={!!confirmarEliminar}
        onClose={() => setConfirmarEliminar(null)}
        title="Eliminar cotización"
        width={400}
      >
        {confirmarEliminar && (
          <div className={styles.confirmDelete}>
            <p>
              ¿Eliminar la cotización{' '}
              <strong>#{String(confirmarEliminar.id).padStart(4, '0')}</strong>
              {confirmarEliminar.cliente_nombre ? ` de ${confirmarEliminar.cliente_nombre}` : ''}?
            </p>
            <div className={styles.formActions}>
              <Button variant="outline" onClick={() => setConfirmarEliminar(null)}>Cancelar</Button>
              <Button variant="danger" loading={guardando} onClick={handleEliminar}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
