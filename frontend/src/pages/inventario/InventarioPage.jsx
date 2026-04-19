import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, Package, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import {
  Button, Badge, Card, CardHeader, CardTitle,
  Modal, Input, Alert, Empty, Spinner
} from '../../components/ui/UI'
import { productosService, camposService } from '../../services/api'
import styles from './Inventario.module.css'

// ── Constantes ────────────────────────────────────────────────────────────
const POR_PAGINA = 150

// ── Stock dinámico por precio ─────────────────────────────────────────────
function getBadge(existencias, precio) {
  if (existencias <= 0) return { variant: 'bajo', label: 'Sin stock' }

  // Umbral dinámico según precio
  let umbralBajo
  if (precio >= 500)     umbralBajo = 2
  else if (precio >= 50) umbralBajo = 5
  else                   umbralBajo = 10

  if (existencias <= umbralBajo) return { variant: 'bajo', label: 'Stock bajo' }

  const umbralMedio = umbralBajo * 3
  if (existencias <= umbralMedio) return { variant: 'medio', label: 'Stock medio' }

  return { variant: 'ok', label: 'OK' }
}

// Cuenta productos con stock crítico para los KPIs
function contarCriticos(productos) {
  return productos.filter((p) => {
    const badge = getBadge(p.existencias, p.precio)
    return badge.variant === 'bajo'
  }).length
}

const FORM_VACIO = { nombre: '', precio: '', existencias: '', descripcion: '' }

// ── Formulario de producto ────────────────────────────────────────────────
function FormProducto({ inicial, onGuardar, onCancelar, cargando, error }) {
  const [form, setForm] = useState(inicial ? {
    ...inicial,
    precio: inicial.precio ?? '',
    existencias: inicial.existencias ?? 0,
    descripcion: inicial.descripcion ?? '',
  } : FORM_VACIO)

  const [camposConfig, setCamposConfig] = useState([])
  const [camposExtra, setCamposExtra] = useState(inicial?.campos_extra || {})

  useEffect(() => {
    camposService.listar()
      .then(({ data }) => setCamposConfig(data))
      .catch(() => {})
  }, [])

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleCampoExtra = (nombre_campo, tipo, valor) => {
    setCamposExtra((prev) => ({
      ...prev,
      [nombre_campo]: tipo === 'numero'
        ? (valor === '' ? null : parseFloat(String(valor).replace(',', '.')))
        : valor || null,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const precio = parseFloat(String(form.precio).replace(',', '.'))
    const existencias = parseFloat(String(form.existencias).replace(',', '.'))
    if (isNaN(precio) || precio < 0) {
      alert('El precio debe ser un número válido mayor o igual a 0')
      return
    }
    const camposLimpios = Object.fromEntries(
      Object.entries(camposExtra).filter(([, v]) => v !== null && v !== '' && v !== undefined)
    )
    onGuardar({
      nombre: form.nombre.trim(),
      precio,
      existencias: isNaN(existencias) ? 0 : existencias,
      descripcion: form.descripcion?.trim() || null,
      campos_extra: Object.keys(camposLimpios).length > 0 ? camposLimpios : null,
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
        autoFocus
      />
      <div className={styles.formRow}>
        <Input
          label="Precio base ($) *"
          name="precio"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={form.precio}
          onChange={handleChange}
        />
        <Input
          label="Existencias"
          name="existencias"
          type="text"
          inputMode="decimal"
          placeholder="0"
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

      {camposConfig.length > 0 && (
        <div className={styles.camposExtraSection}>
          <p className={styles.camposExtraLabel}>Campos personalizados</p>
          <div className={styles.camposExtraGrid}>
            {camposConfig.map((campo) => {
              const valorActual = camposExtra[campo.nombre_campo] ?? ''
              return (
                <div key={campo.id} className={styles.campoExtraItem}>
                  <label className={styles.campoExtraEtiqueta}>
                    {campo.etiqueta}
                    <span className={styles.campoExtraRol}>
                      {campo.rol === 'precio' ? ' · Precio alternativo' : campo.rol === 'codigo' ? ' · Código' : ''}
                    </span>
                  </label>
                  <input
                    type="text"
                    inputMode={campo.tipo === 'numero' ? 'decimal' : 'text'}
                    placeholder={campo.tipo === 'numero' ? '0.00' : 'Opcional'}
                    value={valorActual}
                    onChange={(e) => handleCampoExtra(campo.nombre_campo, campo.tipo, e.target.value)}
                    className={styles.campoExtraInput}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={styles.formActions}>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={cargando}>
          {inicial ? 'Guardar cambios' : 'Agregar producto'}
        </Button>
      </div>
    </form>
  )
}


// ── Modal detalle de producto ─────────────────────────────────────────────
function ModalDetalle({ productoId, onClose }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!productoId) return
    setCargando(true)
    camposService.detalle(productoId)
      .then(({ data }) => setDetalle(data))
      .catch(() => setDetalle(null))
      .finally(() => setCargando(false))
  }, [productoId])

  return (
    <Modal open={!!productoId} onClose={onClose} title="Detalle del producto" width={520}>
      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={28} />
        </div>
      ) : !detalle ? (
        <Alert variant="error">No se pudo cargar el detalle.</Alert>
      ) : (
        <div className={styles.detalle}>
          {/* Campos fijos */}
          <div className={styles.detalleGrupo}>
            <div className={styles.detalleCampo}>
              <span className={styles.detalleLabel}>Nombre</span>
              <span className={styles.detalleValor}>{detalle.nombre}</span>
            </div>
            <div className={styles.detalleCampo}>
              <span className={styles.detalleLabel}>Precio base</span>
              <span className={`${styles.detalleValor} ${styles.detallePrecio}`}>
                ${Number(detalle.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className={styles.detalleCampo}>
              <span className={styles.detalleLabel}>Existencias</span>
              <span className={styles.detalleValor}>{Number(detalle.existencias).toLocaleString()}</span>
            </div>
            {detalle.descripcion && (
              <div className={styles.detalleCampo}>
                <span className={styles.detalleLabel}>Descripción</span>
                <span className={styles.detalleValor}>{detalle.descripcion}</span>
              </div>
            )}
          </div>

          {/* Campos extra con valor */}
          {detalle.campos.filter(c => c.valor !== null && c.valor !== undefined && c.valor !== '').length > 0 && (
            <div className={styles.detalleGrupo}>
              <p className={styles.detalleGrupoTitulo}>Campos personalizados</p>
              {detalle.campos
                .filter(c => c.valor !== null && c.valor !== undefined && c.valor !== '')
                .map((c) => (
                  <div key={c.nombre_campo} className={styles.detalleCampo}>
                    <span className={styles.detalleLabel}>
                      {c.etiqueta}
                      {c.rol === 'precio' && <span className={styles.rolTag}>Precio</span>}
                      {c.rol === 'codigo' && <span className={styles.rolTagCodigo}>Código</span>}
                    </span>
                    <span className={`${styles.detalleValor} ${c.rol === 'precio' ? styles.detallePrecio : ''}`}>
                      {c.rol === 'precio'
                        ? `$${Number(c.valor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : String(c.valor)
                      }
                    </span>
                  </div>
                ))
              }
            </div>
          )}

          {/* Campos sin valor */}
          {detalle.campos.filter(c => c.valor === null || c.valor === undefined || c.valor === '').length > 0 && (
            <p className={styles.detalleSinDatos}>
              {detalle.campos.filter(c => !c.valor && c.valor !== 0).length} campo(s) sin datos para este producto.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Paginador ─────────────────────────────────────────────────────────────
function Paginador({ paginaActual, totalPaginas, onChange }) {
  const [inputVal, setInputVal] = useState(String(paginaActual))

  useEffect(() => { setInputVal(String(paginaActual)) }, [paginaActual])

  const irA = (n) => {
    const p = Math.max(1, Math.min(n, totalPaginas))
    if (p !== paginaActual) onChange(p)
  }

  const handleInputBlur = () => {
    const n = parseInt(inputVal)
    if (!isNaN(n)) irA(n)
    else setInputVal(String(paginaActual))
  }

  const handleInputKey = (e) => {
    if (e.key === 'Enter') handleInputBlur()
  }

  if (totalPaginas <= 1) return null

  return (
    <div className={styles.paginador}>
      <Button
        variant="outline"
        size="sm"
        icon={ChevronLeft}
        onClick={() => irA(paginaActual - 1)}
        disabled={paginaActual === 1}
      >
        Página anterior
      </Button>

      <div className={styles.paginadorCentro}>
        <span className={styles.paginadorTexto}>Página</span>
        <input
          className={styles.paginadorInput}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKey}
          type="text"
          inputMode="numeric"
        />
        <span className={styles.paginadorTexto}>de <strong>{totalPaginas}</strong></span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => irA(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
      >
        Página siguiente
        <ChevronRight size={15} />
      </Button>
    </div>
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
  const [resultados, setResultados] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const busquedaTimer = useRef(null)

  const [pagina, setPagina] = useState(1)

  const [modalAgregar, setModalAgregar] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [productoEliminar, setProductoEliminar] = useState(null)
  const [productoDetalle, setProductoDetalle] = useState(null)

  // Cargar todos los productos (para paginación y KPIs correctos)
  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await productosService.listar({ limit: 500 })
      setProductos(data)
      setPagina(1)
    } catch {
      setError('No se pudo cargar el inventario. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  // Búsqueda fuzzy con debounce — busca en TODO el inventario
  useEffect(() => {
    clearTimeout(busquedaTimer.current)
    if (!busqueda.trim()) { setResultados(null); setPagina(1); return }
    if (busqueda.trim().length < 2) { setResultados([]); return }

    busquedaTimer.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await productosService.buscar(busqueda.trim(), 50)
        setResultados(data)
        setPagina(1)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)

    return () => clearTimeout(busquedaTimer.current)
  }, [busqueda])

  // Lista base: resultados de búsqueda o todos los productos
  const listaBase = resultados !== null ? resultados : productos

  // Paginación — solo aplica cuando NO hay búsqueda activa
  const enBusqueda = resultados !== null
  const totalPaginas = enBusqueda ? 1 : Math.ceil(listaBase.length / POR_PAGINA)
  const inicio = enBusqueda ? 0 : (pagina - 1) * POR_PAGINA
  const lista = enBusqueda ? listaBase : listaBase.slice(inicio, inicio + POR_PAGINA)

  // KPIs — siempre sobre TODOS los productos, no la página actual
  const totalCriticos = contarCriticos(productos)
  const sinStock = productos.filter((p) => p.existencias <= 0).length

  // CRUD
  const handleAgregar = async (datos) => {
    setGuardando(true)
    setFormError(null)
    try {
      const { data } = await productosService.crear(datos)
      setProductos((p) => [data, ...p])
      setModalAgregar(false)
      setPagina(1)
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
      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>

        {/* Total productos */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.kpiNaranja}`}>
            <Package size={22} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Total en inventario</p>
            <p className={styles.kpiValue}>{productos.length.toLocaleString()}</p>
            <p className={styles.kpiSub}>productos registrados</p>
          </div>
        </div>

        {/* Stock crítico — jerarquía visual fuerte cuando hay problemas */}
        <div className={`${styles.kpiCard} ${totalCriticos > 0 ? styles.kpiCardCritico : ''}`}>
          <div className={`${styles.kpiIcon} ${totalCriticos > 0 ? styles.kpiRojo : styles.kpiVerde}`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className={styles.kpiLabel}>
              {totalCriticos > 0 ? 'Requieren atención' : 'Stock en orden'}
            </p>
            <p className={`${styles.kpiValue} ${totalCriticos > 0 ? styles.kpiValueCritico : styles.kpiValueOk}`}>
              {totalCriticos > 0 ? totalCriticos : '✓'}
            </p>
            <p className={styles.kpiSub}>
              {totalCriticos > 0
                ? `${sinStock} sin stock · ${totalCriticos - sinStock} stock bajo`
                : 'Todos los productos tienen stock suficiente'
              }
            </p>
          </div>
        </div>

      </div>

      {/* ── Tabla ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className={styles.headerLeft}>
            <CardTitle>Inventario</CardTitle>
            {!enBusqueda && totalPaginas > 1 && (
              <span className={styles.contadorPagina}>
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, listaBase.length)} de {listaBase.length.toLocaleString()}
              </span>
            )}
            {enBusqueda && (
              <span className={styles.contadorPagina}>
                {listaBase.length} resultado{listaBase.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className={styles.headerRight}>
            <div className={styles.searchBox}>
              {buscando
                ? <Spinner size={16} />
                : <Search size={16} className={styles.searchIcon} />
              }
              <input
                className={styles.searchInput}
                placeholder="Buscar en todo el inventario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={styles.searchClear} onClick={() => setBusqueda('')}>✕</button>
              )}
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={cargarProductos} title="Actualizar" />
            <Button
              variant="primary" size="sm" icon={Plus}
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
          <>
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
                    const badge = getBadge(p.existencias, p.precio)
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
                            onClick={() => setProductoDetalle(p.id)}
                            title="Ver detalle"
                          >
                            <Eye size={15} />
                          </button>
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

            {/* Paginador — solo visible cuando no hay búsqueda activa */}
            {!enBusqueda && (
              <Paginador
                paginaActual={pagina}
                totalPaginas={totalPaginas}
                onChange={(p) => { setPagina(p); window.scrollTo(0, 0) }}
              />
            )}
          </>
        )}
      </Card>

      {/* Modales */}
      <Modal open={modalAgregar} onClose={() => setModalAgregar(false)} title="Agregar producto">
        <FormProducto
          onGuardar={handleAgregar}
          onCancelar={() => setModalAgregar(false)}
          cargando={guardando}
          error={formError}
        />
      </Modal>

      <Modal open={!!productoEditar} onClose={() => setProductoEditar(null)} title="Editar producto">
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

      <Modal open={!!productoEliminar} onClose={() => setProductoEliminar(null)} title="Eliminar producto" width={400}>
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
              <Button variant="outline" onClick={() => setProductoEliminar(null)}>Cancelar</Button>
              <Button variant="danger" loading={guardando} onClick={handleEliminar}>Sí, eliminar</Button>
            </div>
          </div>
        )}
      </Modal>

      <ModalDetalle
        productoId={productoDetalle}
        onClose={() => setProductoDetalle(null)}
      />
    </div>
  )
}
