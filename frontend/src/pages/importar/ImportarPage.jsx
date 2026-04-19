import { useState, useCallback, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { Button, Alert, Card, CardHeader, CardTitle, Spinner } from '../../components/ui/UI'
import { productosService } from '../../services/api'
import styles from './Importar.module.css'

const CAMPOS_FIJOS = ['nombre', 'precio', 'existencias', 'descripcion']
const CAMPOS_LABEL = {
  nombre: 'Nombre *',
  precio: 'Precio *',
  existencias: 'Existencias',
  descripcion: 'Descripción',
}

// Paso 1: Subir archivo
function PasoSubir({ onArchivo, cargando }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const procesar = (file) => {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      alert('Solo se aceptan archivos Excel (.xlsx, .xls)')
      return
    }
    onArchivo(file)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    procesar(e.dataTransfer.files[0])
  }, [])

  return (
    <div className={styles.pasoSubir}>
      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {cargando ? (
          <>
            <Spinner size={40} />
            <p className={styles.dropText}>Leyendo archivo...</p>
          </>
        ) : (
          <>
            <FileSpreadsheet size={48} className={styles.dropIcon} />
            <p className={styles.dropText}>
              Arrastra tu lista de precios en Excel aquí
            </p>
            <p className={styles.dropSub}>o haz clic para seleccionar el archivo</p>
            <p className={styles.dropFormato}>Formatos aceptados: .xlsx, .xls</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className={styles.inputOculto}
          onChange={(e) => procesar(e.target.files[0])}
        />
      </div>

      <div className={styles.filaInicio}>
        <p className={styles.filaLabel}>
          ¿Tu lista de precios tiene encabezados en otra fila?
        </p>
        <p className={styles.filaSub}>
          Si el archivo tiene datos antes del encabezado (como fecha o logo), 
          indica desde qué fila empiezan los títulos de columna.
        </p>
      </div>
    </div>
  )
}

// Paso 2: Mapeo de columnas
function PasoMapeo({ columnas, mapeoSugerido, preview, filaInicio, onCambiarFila, onConfirmar, cargando }) {
  const [mapeo, setMapeo] = useState(mapeoSugerido)
  const [camposExtra, setCamposExtra] = useState([])

  const setMapeoCampo = (campo, columna) => {
    setMapeo((prev) => {
      const nuevo = { ...prev }
      // quitar si ya estaba asignado a otra columna
      Object.keys(nuevo).forEach((col) => {
        if (nuevo[col] === campo) delete nuevo[col]
      })
      if (columna) nuevo[columna] = campo
      return nuevo
    })
  }

  const getMapeadoEn = (campo) =>
    Object.entries(mapeo).find(([, v]) => v === campo)?.[0] || ''

  const toggleCampoExtra = (col) => {
    setCamposExtra((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  // Columnas no asignadas a ningún campo fijo
  const sinAsignar = columnas.filter(
    (col) => !mapeo[col] || !CAMPOS_FIJOS.includes(mapeo[col])
  )

  const nombreOk = !!getMapeadoEn('nombre')
  const precioOk = !!getMapeadoEn('precio')
  const listo = nombreOk && precioOk

  return (
    <div className={styles.pasoMapeo}>
      {/* Fila de inicio */}
      <div className={styles.filaInicioBox}>
        <label className={styles.filaInicioLabel}>Fila donde empiezan los encabezados:</label>
        <input
          type="number"
          min="1"
          value={filaInicio}
          onChange={(e) => onCambiarFila(Number(e.target.value))}
          className={styles.filaInicioInput}
        />
      </div>

      {/* Mapeo de campos fijos */}
      <div className={styles.mapeoGrid}>
        {CAMPOS_FIJOS.map((campo) => (
          <div key={campo} className={`${styles.mapeoCard} ${getMapeadoEn(campo) ? styles.mapeoCardOk : ''}`}>
            <div className={styles.mapeoCardHeader}>
              <span className={styles.mapeoNombre}>{CAMPOS_LABEL[campo]}</span>
              {getMapeadoEn(campo)
                ? <CheckCircle size={16} className={styles.iconOk} />
                : campo === 'nombre' || campo === 'precio'
                  ? <AlertCircle size={16} className={styles.iconPend} />
                  : null
              }
            </div>
            <select
              className={styles.mapeoSelect}
              value={getMapeadoEn(campo)}
              onChange={(e) => setMapeoCampo(campo, e.target.value)}
            >
              <option value="">— No importar —</option>
              {columnas.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Columnas sin asignar → campos extra */}
      {sinAsignar.length > 0 && (
        <div className={styles.extraSection}>
          <p className={styles.extraLabel}>
            Columnas adicionales — márcalas si quieres importarlas como campos extra:
          </p>
          <div className={styles.extraList}>
            {sinAsignar.map((col) => (
              <label key={col} className={styles.extraItem}>
                <input
                  type="checkbox"
                  checked={camposExtra.includes(col)}
                  onChange={() => toggleCampoExtra(col)}
                  className={styles.extraCheck}
                />
                <span>{col}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className={styles.previewSection}>
          <p className={styles.previewLabel}>Vista previa (primeras {preview.length} filas)</p>
          <div className={styles.previewTable}>
            <table>
              <thead>
                <tr>
                  {columnas.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((fila, i) => (
                  <tr key={i}>
                    {columnas.map((col) => (
                      <td key={col}>{String(fila[col] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!listo && (
        <Alert variant="warning">
          Los campos <strong>Nombre</strong> y <strong>Precio</strong> son obligatorios.
          Asígnalos para continuar.
        </Alert>
      )}

      <div className={styles.formActions}>
        <Button
          variant="primary"
          icon={ChevronRight}
          loading={cargando}
          disabled={!listo}
          onClick={() => onConfirmar(mapeo, camposExtra)}
        >
          Importar productos
        </Button>
      </div>
    </div>
  )
}

// Paso 3: Resultado
function PasoResultado({ importados, errores, onNuevaImportacion }) {
  return (
    <div className={styles.resultado}>
      <CheckCircle size={52} className={styles.resultadoIcon} />
      <h2 className={styles.resultadoTitulo}>Importación completada</h2>
      <p className={styles.resultadoSub}>
        Se importaron <strong>{importados}</strong> producto(s) correctamente.
        {errores.length > 0 && ` ${errores.length} fila(s) no pudieron importarse.`}
      </p>

      {errores.length > 0 && (
        <div className={styles.erroresBox}>
          <p className={styles.erroresLabel}>Filas con error:</p>
          <ul className={styles.erroresList}>
            {errores.slice(0, 10).map((e, i) => (
              <li key={i}>
                Fila {e.fila}: {e.motivo}
              </li>
            ))}
            {errores.length > 10 && <li>...y {errores.length - 10} más.</li>}
          </ul>
        </div>
      )}

      <Button variant="primary" onClick={onNuevaImportacion} icon={Upload}>
        Importar otro archivo
      </Button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ImportarPage() {
  const [paso, setPaso] = useState(1)  // 1 | 2 | 3
  const [archivo, setArchivo] = useState(null)
  const [filaInicio, setFilaInicio] = useState(1)
  const [preview, setPreview] = useState({ columnas: [], mapeo_sugerido: {}, preview: [] })
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const handleArchivo = async (file) => {
    setArchivo(file)
    setError(null)
    setCargando(true)
    try {
      const { data } = await productosService.previewExcel(file, filaInicio)
      setPreview(data)
      setPaso(2)
    } catch {
      setError('No se pudo leer el archivo. Verifica que sea un Excel válido.')
    } finally {
      setCargando(false)
    }
  }

  const handleCambiarFila = async (nuevaFila) => {
    setFilaInicio(nuevaFila)
    if (!archivo) return
    setCargando(true)
    try {
      const { data } = await productosService.previewExcel(archivo, nuevaFila)
      setPreview(data)
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }

  const handleConfirmar = async (mapeo, camposExtra) => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await productosService.confirmarImportacion(
        archivo, mapeo, camposExtra, filaInicio
      )
      setResultado(data)
      setPaso(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error durante la importación.')
    } finally {
      setCargando(false)
    }
  }

  const reiniciar = () => {
    setPaso(1)
    setArchivo(null)
    setFilaInicio(1)
    setPreview({ columnas: [], mapeo_sugerido: {}, preview: [] })
    setResultado(null)
    setError(null)
  }

  return (
    <div className={styles.page}>
      <Card>
        <CardHeader>
          <CardTitle>Importar desde Excel</CardTitle>
          {/* Indicador de pasos */}
          <div className={styles.pasos}>
            {['Subir archivo', 'Revisar columnas', 'Listo'].map((label, i) => (
              <div
                key={i}
                className={`${styles.pasoBadge} ${paso > i ? styles.pasoDone : ''} ${paso === i + 1 ? styles.pasoActivo : ''}`}
              >
                <span className={styles.pasoNum}>{i + 1}</span>
                <span className={styles.pasoLabel}>{label}</span>
              </div>
            ))}
          </div>
        </CardHeader>

        <div className={styles.body}>
          {error && <Alert variant="error">{error}</Alert>}

          {paso === 1 && (
            <PasoSubir onArchivo={handleArchivo} cargando={cargando} />
          )}
          {paso === 2 && (
            <PasoMapeo
              columnas={preview.columnas}
              mapeoSugerido={preview.mapeo_sugerido}
              preview={preview.preview}
              filaInicio={filaInicio}
              onCambiarFila={handleCambiarFila}
              onConfirmar={handleConfirmar}
              cargando={cargando}
            />
          )}
          {paso === 3 && resultado && (
            <PasoResultado
              importados={resultado.importados}
              errores={resultado.errores}
              onNuevaImportacion={reiniciar}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
