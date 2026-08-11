import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function RentaAnual() {
  const [declaraciones, setDeclaraciones] = useState([])
  const [cierresPorAnio, setCierresPorAnio] = useState({})
  const [expandido, setExpandido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const navigate = useNavigate()

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
  const fmt = (n) => `₡${(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`

  const anioAnterior = () => (new Date().getFullYear() - 1).toString()

  const [anioSeleccionado, setAnioSeleccionado] = useState(anioAnterior())
  const [tipoContribuyente, setTipoContribuyente] = useState("fisica")

  const nombreMes = (mes) => {
    const [year, month] = mes.split("-")
    const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    return `${nombres[parseInt(month) - 1]} ${year}`
  }

  const cargarDeclaraciones = async () => {
    try {
      const res = await fetch(`/api/renta?usuario_id=${usuario.id}`)
      const data = await res.json()
      if (data.ok) setDeclaraciones(data.declaraciones)
    } catch (err) {
      console.error("Error cargando declaraciones de renta:", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!usuario.id) { navigate("/"); return }
    cargarDeclaraciones()
  }, [])

  const calcularRenta = async () => {
    setGenerando(true)
    try {
      const res = await fetch("/api/renta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id, anio: anioSeleccionado, tipo_contribuyente: tipoContribuyente })
      })
      const data = await res.json()
      if (data.ok) await cargarDeclaraciones()
      else alert(data.error || "Error al calcular renta")
    } catch (err) {
      console.error("Error calculando renta:", err)
    } finally {
      setGenerando(false)
    }
  }

  const cambiarEstado = async (declaracion_id, estado) => {
    try {
      await fetch("/api/renta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declaracion_id, estado })
      })
      await cargarDeclaraciones()
    } catch (err) {
      console.error("Error actualizando estado:", err)
    }
  }

  const eliminarDeclaracion = async (declaracion_id, anio) => {
    if (!window.confirm(`¿Seguro que querés eliminar el cálculo de Renta ${anio}? Esta acción no se puede deshacer.`)) return
    try {
      await fetch("/api/renta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declaracion_id })
      })
      await cargarDeclaraciones()
    } catch (err) {
      console.error("Error eliminando declaracion:", err)
    }
  }

  const toggleDetalle = async (anio) => {
    if (expandido === anio) { setExpandido(null); return }
    setExpandido(anio)
    if (!cierresPorAnio[anio]) {
      try {
        const res = await fetch(`/api/cierres?usuario_id=${usuario.id}`)
        const data = await res.json()
        if (data.ok) {
          const delAnio = data.cierres
            .filter(c => c.mes.startsWith(anio) && (c.estado === "declarado" || c.estado === "pagado"))
            .sort((a, b) => a.mes.localeCompare(b.mes))
          setCierresPorAnio(prev => ({ ...prev, [anio]: delAnio }))
        }
      } catch (err) {
        console.error("Error cargando detalle mensual:", err)
      }
    }
  }

  const exportarTXT = (d) => {
    const contenido = `
FISCALCR — DECLARACION DE RENTA
================================
Periodo fiscal: ${d.anio}
Usuario: ${usuario.nombre}
Tipo de contribuyente: ${d.tipo_contribuyente === "juridica" ? "Persona Juridica" : "Persona Fisica con Actividad Lucrativa"}

RESUMEN
-------
Ingreso bruto (ventas netas):   ${fmt(d.ingreso_bruto)}
Gastos deducibles (compras):    ${fmt(d.gastos_deducibles)}
Renta neta:                     ${fmt(d.renta_neta)}
Impuesto a pagar:               ${fmt(d.impuesto)}

Estado: ${d.estado.toUpperCase()}
${d.fecha_declarado ? `Declarado el: ${d.fecha_declarado}` : ""}

Nota: calculo basado en los tramos del Impuesto sobre la Renta
vigentes para el periodo fiscal 2026 (Decreto 45333-H).
No incluye creditos fiscales por hijos o conyuge.

Generado por FiscalCR — fiscalcr.pages.dev
    `.trim()

    const blob = new Blob([contenido], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `FiscalCR-Renta-${d.anio}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const estadoBadge = (estado) => {
    if (estado === "declarado") return "bg-green-100 text-green-700"
    if (estado === "pagado") return "bg-blue-100 text-blue-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">FiscalCR</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </button>
          <button onClick={() => { localStorage.removeItem("usuario"); navigate("/") }} className="text-sm text-red-500 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Declaración de Renta</h2>
            <p className="text-gray-500 text-sm">Cálculo anual del Impuesto sobre las Utilidades (D-101)</p>
          </div>
        </div>

        {/* Controles de generación */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Año fiscal</label>
              <input
                type="number"
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-28"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de contribuyente</label>
              <select
                value={tipoContribuyente}
                onChange={(e) => setTipoContribuyente(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                <option value="fisica">Persona Física (actividad lucrativa)</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
            </div>
            <button
              onClick={calcularRenta}
              disabled={generando || !anioSeleccionado}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              {generando ? "Calculando..." : `📊 Calcular Renta ${anioSeleccionado}`}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            El cálculo toma solo los meses ya declarados/pagados en Historial de cierres para ese año.
            No incluye créditos fiscales por hijos o cónyuge.
          </p>
        </div>

        {cargando ? (
          <p className="text-gray-500">Cargando declaraciones...</p>
        ) : declaraciones.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-lg mb-2">No hay declaraciones de renta registradas</p>
            <p className="text-gray-400 text-sm">Elegí el año arriba y generá tu primer cálculo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {declaraciones.map((d) => (
              <div key={d.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Renta {d.anio}</h3>
                    <p className="text-xs text-gray-400">
                      {d.tipo_contribuyente === "juridica" ? "Persona Jurídica" : "Persona Física - Actividad Lucrativa"}
                      {d.fecha_declarado && ` · Declarado el ${d.fecha_declarado}`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${estadoBadge(d.estado)}`}>
                    {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                  </span>
                </div>

                {/* Montos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-500 mb-1">Ingreso bruto</p>
                    <p className="font-bold text-blue-700">{fmt(d.ingreso_bruto)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-500 mb-1">Gastos deducibles</p>
                    <p className="font-bold text-green-700">{fmt(d.gastos_deducibles)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Renta neta</p>
                    <p className="font-bold text-gray-700">{fmt(d.renta_neta)}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-indigo-500 mb-1">Impuesto a pagar</p>
                    <p className="font-bold text-indigo-700">{fmt(d.impuesto)}</p>
                  </div>
                </div>

                {/* Detalle mensual expandible */}
                <button
                  onClick={() => toggleDetalle(d.anio)}
                  className="text-sm text-blue-600 hover:underline mb-3">
                  {expandido === d.anio ? "▲ Ocultar detalle mensual" : "▼ Ver detalle mensual"}
                </button>

                {expandido === d.anio && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Mes</th>
                          <th className="text-right px-3 py-2 font-medium">Ventas netas</th>
                          <th className="text-right px-3 py-2 font-medium">Compras netas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(cierresPorAnio[d.anio] || []).map(c => (
                          <tr key={c.id} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-700">{nombreMes(c.mes)}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{fmt(c.neto_ventas)}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{fmt(c.neto_compras)}</td>
                          </tr>
                        ))}
                        {(cierresPorAnio[d.anio] || []).length === 0 && (
                          <tr><td colSpan="3" className="px-3 py-3 text-center text-gray-400">Sin meses declarados para este año</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => exportarTXT(d)}
                    className="text-sm bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-200 transition">
                    📄 Exportar
                  </button>
                  {d.estado === "pendiente" && (
                    <button
                      onClick={() => cambiarEstado(d.id, "declarado")}
                      className="text-sm bg-green-100 text-green-700 px-4 py-1.5 rounded-lg hover:bg-green-200 transition">
                      ✅ Marcar declarado
                    </button>
                  )}
                  {d.estado === "declarado" && (
                    <button
                      onClick={() => cambiarEstado(d.id, "pagado")}
                      className="text-sm bg-blue-100 text-blue-700 px-4 py-1.5 rounded-lg hover:bg-blue-200 transition">
                      💰 Marcar pagado
                    </button>
                  )}
                  {d.estado !== "pendiente" && (
                    <button
                      onClick={() => cambiarEstado(d.id, "pendiente")}
                      className="text-sm bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-lg hover:bg-yellow-200 transition">
                      ↩ Revertir
                    </button>
                  )}
                  <button
                    onClick={() => eliminarDeclaracion(d.id, d.anio)}
                    className="text-sm bg-red-100 text-red-700 px-4 py-1.5 rounded-lg hover:bg-red-200 transition">
                    🗑 Eliminar
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
