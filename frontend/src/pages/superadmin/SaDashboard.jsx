import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, Package, FileText,
  CheckCircle, XCircle, Clock, Plus,
  LogOut, Search, RefreshCw, ChevronDown, Calendar
} from 'lucide-react'
import { Button, Badge, Alert, Input, Modal, Spinner } from '../../components/ui/UI'
import { saService } from '../../services/saApi'
import useSaStore from '../../store/saStore'
import styles from './SA.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function planBadge(plan, activo, trial_hasta) {
  if (!activo) return { variant: 'bajo', label: 'Suspendido' }
  if (plan === 'trial') {
    const vence = trial_hasta ? new Date(trial_hasta) : null
    const hoy = new Date()
    if (vence && vence < hoy) return { variant: 'bajo', label: 'Trial vencido' }
    return { variant: 'medio', label: 'Trial' }
  }
  return { variant: 'ok', label: 'Activo' }
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`${styles.kpiCard} ${styles[`kpi_${color}`]}`}>
      <div className={`${styles.kpiIcon} ${styles[`kpiIcon_${color}`]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className={styles.kpiLabel}>{label}</p>
        <p className={styles.kpiValue}>{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ── Modal Editar Tenant ───────────────────────────────────────────────────
function ModalEditarTenant({ tenant, onClose, onGuardado }) {
  const [form, setForm] = useState({
    nombre: tenant.nombre,
    plan: tenant.plan,
    trial_hasta: tenant.trial_hasta || '',
    activo: tenant.activo,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [diasTrial, setDiasTrial] = useState(14)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleGuardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      const { data } = await saService.tenants.actualizar(tenant.id, {
        nombre: form.nombre,
        plan: form.plan,
        trial_hasta: form.trial_hasta || null,
        activo: form.activo,
      })
      onGuardado(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleExtenderTrial = async () => {
    setGuardando(true)
    setError(null)
    try {
      await saService.tenants.extenderTrial(tenant.id, diasTrial)
      const { data } = await saService.tenants.obtener(tenant.id)
      onGuardado(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al extender trial')
    } finally {
      setGuardando(false)
    }
  }

  const handleSuspender = async () => {
    if (!confirm(`¿Suspender la cuenta de ${tenant.nombre}?`)) return
    setGuardando(true)
    try {
      const { data } = await saService.tenants.suspender(tenant.id)
      onGuardado(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error')
    } finally {
      setGuardando(false)
    }
  }

  const handleActivar = async () => {
    setGuardando(true)
    try {
      const { data } = await saService.tenants.activar(tenant.id)
      onGuardado(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Gestionar: ${tenant.nombre}`} width={520}>
      <div className={styles.editForm}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className={styles.editSection}>
          <p className={styles.editSectionLabel}>Información del negocio</p>
          <Input
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
          />
          <div className={styles.editRow}>
            <div className={styles.inputWrapper}>
              <label className={styles.editLabel}>Plan</label>
              <select name="plan" value={form.plan} onChange={handleChange} className={styles.editSelect}>
                <option value="trial">Trial</option>
                <option value="activo">Activo (pagando)</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
            <Input
              label="Vence trial"
              name="trial_hasta"
              type="date"
              value={form.trial_hasta}
              onChange={handleChange}
            />
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
            <span>Cuenta activa</span>
          </label>
        </div>

        <div className={styles.editSection}>
          <p className={styles.editSectionLabel}>Extender trial</p>
          <div className={styles.editRow}>
            <div className={styles.inputWrapper}>
              <label className={styles.editLabel}>Días a agregar</label>
              <input
                type="number"
                min="1"
                max="90"
                value={diasTrial}
                onChange={(e) => setDiasTrial(Number(e.target.value))}
                className={styles.editInput}
              />
            </div>
            <div style={{ paddingTop: 22 }}>
              <Button variant="outline" icon={Calendar} onClick={handleExtenderTrial} loading={guardando}>
                Extender {diasTrial} días
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.editSection}>
          <p className={styles.editSectionLabel}>Acciones rápidas</p>
          <div className={styles.editActions}>
            {tenant.activo
              ? <Button variant="danger" onClick={handleSuspender} loading={guardando}>
                  Suspender cuenta
                </Button>
              : <Button variant="secondary" onClick={handleActivar} loading={guardando}>
                  Reactivar cuenta
                </Button>
            }
          </div>
        </div>

        <div className={styles.editFooter}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleGuardar} loading={guardando}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal Nuevo Tenant ────────────────────────────────────────────────────
function ModalNuevoTenant({ onClose, onCreado }) {
  const [form, setForm] = useState({
    nombre_negocio: '', nombre_usuario: '', email: '', password: '',
    plan: 'trial', trial_dias: 14,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const { data } = await saService.tenants.crear({
        ...form,
        trial_dias: Number(form.trial_dias),
      })
      onCreado(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el negocio')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Nuevo negocio" width={480}>
      <form onSubmit={handleSubmit} className={styles.editForm}>
        {error && <Alert variant="error">{error}</Alert>}
        <Input label="Nombre del negocio *" name="nombre_negocio" value={form.nombre_negocio} onChange={handleChange} required autoFocus />
        <Input label="Nombre del dueño *" name="nombre_usuario" value={form.nombre_usuario} onChange={handleChange} required />
        <Input label="Correo *" type="email" name="email" value={form.email} onChange={handleChange} required />
        <Input label="Contraseña *" type="password" name="password" value={form.password} onChange={handleChange} required />
        <div className={styles.editRow}>
          <div className={styles.inputWrapper}>
            <label className={styles.editLabel}>Plan</label>
            <select name="plan" value={form.plan} onChange={handleChange} className={styles.editSelect}>
              <option value="trial">Trial</option>
              <option value="activo">Activo</option>
            </select>
          </div>
          {form.plan === 'trial' && (
            <Input label="Días de trial" type="text" name="trial_dias"
              value={form.trial_dias} onChange={handleChange} />
          )}
        </div>
        <div className={styles.editFooter}>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={guardando}>Crear negocio</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────
export default function SaDashboard() {
  const navigate = useNavigate()
  const { logout } = useSaStore()
  const [stats, setStats] = useState(null)
  const [tenants, setTenants] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [buscar, setBuscar] = useState('')
  const [filtroplan, setFiltroPlan] = useState('')
  const [tenantEditar, setTenantEditar] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        saService.stats(),
        saService.tenants.listar(),
      ])
      setStats(statsRes.data)
      setTenants(tenantsRes.data)
    } catch {
      setError('Error al cargar datos. Verifica tu sesión.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleLogout = () => { logout(); navigate('/superadmin/login') }

  const tenantsFiltrados = tenants.filter((t) => {
    const matchBuscar = !buscar ||
      t.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      t.email_contacto.toLowerCase().includes(buscar.toLowerCase())
    const matchPlan = !filtroplan || t.plan === filtroplan
    return matchBuscar && matchPlan
  })

  return (
    <div className={styles.saRoot}>
      {/* Topbar */}
      <header className={styles.saTopbar}>
        <div className={styles.saTopbarLeft}>
          <div className={styles.saBrand}>
            <span className={styles.saBrandBadge}>SA</span>
            <span>FerreStock <span className={styles.saBrandSub}>Admin</span></span>
          </div>
        </div>
        <Button variant="ghost" icon={LogOut} onClick={handleLogout} size="sm"
          style={{ color: 'rgba(255,255,255,0.7)' }}>
          Salir
        </Button>
      </header>

      <div className={styles.saContent}>
        {error && <Alert variant="error">{error}</Alert>}

        {/* KPIs */}
        {stats && (
          <div className={styles.saKpiGrid}>
            <KpiCard icon={Building2} label="Negocios totales"   value={stats.total_tenants}      color="azul" />
            <KpiCard icon={CheckCircle} label="Pagando"          value={stats.tenants_pagando}     color="verde" />
            <KpiCard icon={Clock}       label="En trial"         value={stats.tenants_trial}       color="naranja" />
            <KpiCard icon={XCircle}     label="Suspendidos"      value={stats.tenants_suspendidos} color="rojo" />
            <KpiCard icon={Package}     label="Productos totales" value={stats.total_productos}    color="azul" />
            <KpiCard icon={FileText}    label="Cotizaciones"     value={stats.total_cotizaciones}  color="naranja" />
            <KpiCard icon={Users}       label="Nuevos este mes"  value={stats.nuevos_este_mes}     color="verde" />
          </div>
        )}

        {/* Tabla de negocios */}
        <div className={styles.saCard}>
          <div className={styles.saCardHeader}>
            <h2 className={styles.saCardTitle}>Negocios registrados</h2>
            <div className={styles.saHeaderRight}>
              <div className={styles.saSearch}>
                <Search size={15} />
                <input
                  placeholder="Buscar negocio..."
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className={styles.saSearchInput}
                />
              </div>
              <select
                value={filtroplan}
                onChange={(e) => setFiltroPlan(e.target.value)}
                className={styles.saFilter}
              >
                <option value="">Todos los planes</option>
                <option value="trial">Trial</option>
                <option value="activo">Activos</option>
              </select>
              <Button variant="outline" icon={RefreshCw} size="sm" onClick={cargar} />
              <Button variant="primary" icon={Plus} size="sm" onClick={() => setModalNuevo(true)}>
                Nuevo negocio
              </Button>
            </div>
          </div>

          {cargando ? (
            <div className={styles.saLoading}><Spinner size={32} /></div>
          ) : (
            <div className={styles.saTableWrapper}>
              <table className={styles.saTable}>
                <thead>
                  <tr>
                    <th>Negocio</th>
                    <th>Correo</th>
                    <th>Plan</th>
                    <th>Vence trial</th>
                    <th>Productos</th>
                    <th>Cotizaciones</th>
                    <th>Registro</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tenantsFiltrados.map((t) => {
                    const badge = planBadge(t.plan, t.activo, t.trial_hasta)
                    return (
                      <tr key={t.id} className={!t.activo ? styles.rowSuspendido : ''}>
                        <td className={styles.tdNombre}>{t.nombre}</td>
                        <td className={styles.tdSec}>{t.email_contacto}</td>
                        <td><Badge variant={badge.variant}>{badge.label}</Badge></td>
                        <td className={styles.tdSec}>
                          {t.plan === 'trial' && t.trial_hasta ? fmtFecha(t.trial_hasta) : '—'}
                        </td>
                        <td className={styles.tdNum}>{t.total_productos}</td>
                        <td className={styles.tdNum}>{t.total_cotizaciones}</td>
                        <td className={styles.tdSec}>{fmtFecha(t.creado_en)}</td>
                        <td>
                          <button
                            className={styles.saActionBtn}
                            onClick={() => setTenantEditar(t)}
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {tenantsFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className={styles.tdEmpty}>
                        No hay negocios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {tenantEditar && (
        <ModalEditarTenant
          tenant={tenantEditar}
          onClose={() => setTenantEditar(null)}
          onGuardado={(updated) => {
            setTenants((prev) => prev.map((t) => t.id === updated.id ? updated : t))
            setTenantEditar(null)
          }}
        />
      )}

      {modalNuevo && (
        <ModalNuevoTenant
          onClose={() => setModalNuevo(false)}
          onCreado={(nuevo) => {
            setTenants((prev) => [nuevo, ...prev])
            setModalNuevo(false)
            cargar() // refrescar stats
          }}
        />
      )}
    </div>
  )
}
