import { Loader2 } from 'lucide-react'
import styles from './UI.module.css'

// ── Button ────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <Loader2 size={15} className={styles.spin} />
        : Icon && <Icon size={15} />
      }
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
export function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className={`${styles.inputWrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputBox} ${error ? styles.inputError : ''}`}>
        {Icon && <Icon size={16} className={styles.inputIcon} />}
        <input className={styles.input} {...props} />
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`${styles.inputWrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.inputBox} ${styles.select} ${error ? styles.inputError : ''}`} {...props}>
        {children}
      </select>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className = '', accent }) {
  return (
    <div className={`${styles.card} ${accent ? styles[`card_${accent}`] : ''} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`${styles.cardHeader} ${className}`}>{children}</div>
}

export function CardTitle({ children }) {
  return <h2 className={styles.cardTitle}>{children}</h2>
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────
export function Alert({ children, variant = 'error' }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${variant}`]}`}>
      {children}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return <Loader2 size={size} className={styles.spin} style={{ color: 'var(--naranja)' }} />
}

// ── Empty state ───────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, description, action }) {
  return (
    <div className={styles.empty}>
      {Icon && <Icon size={48} className={styles.emptyIcon} />}
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyDesc}>{description}</p>}
      {action}
    </div>
  )
}
