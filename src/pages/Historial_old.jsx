import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Historial() {
  const [cierres, setCierres] = useState([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const navigate = useNavigate()

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
  const fmt = (n) => `₡${(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`

  // Mes calendario actual, usado solo como tope máximo del selector (no se declara el mes en curso)
  const mesActual = new Date().toISOString().substring(0, 7)

  // Por defecto se propone el mes ANTERIOR, que es el que normalmente ya cerró y se puede declarar
  const calcularMesAnterior = () => {
    const hoy = new Date()
    hoy.setMonth(hoy.getMonth() - 1)
    return hoy.toISOString().substring(0, 7)
  }

  const [mesSeleccionado, setMesSeleccionado] = useState(calcularMesAnterior())

  const cargarCierres = async () => {
    try {
      const res = await fetch(`/api/cierres?usuario_id=${usuario.id}`)
      const data = await res.json()
      if (data.ok) setCierres(data.cierres)
    } catch (err) {
      console.error("Error cargando cierres:", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!usuario.id) { navigate("/"); return }
    cargarCierres()
  }, [])

  const generarCierre = async (mes) => {
    setGenerando(true)
    try {
      const res = await fetch("/api/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id, mes })
      })
      const data = await res.json()
      if (data.ok) await cargarCierres()
    } catch (err) {
      console.error("Error generando cierre:", err)
    } finally {
      setGenerando(false)
    }
  }

  const cambiarEstado = async (cierre_id, estado) => {
    try {
      await fetch("/api/cierres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cierre_id, estado })
      })
      await cargarCierres()
    } catch (err) {
      console.error("Error actualizando estado:", err)
    }
  }

  const eliminarCierre = async (cierre_id, mes) => {
    if (!window.confirm(`¿Seguro que querés eliminar el cierre de ${nombreMes(mes)}? Esta acción no se puede deshacer.`)) return
    try {
      await fetch("/api/cierres", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cierre_id })
      })
      await cargarCierres()
    } catch (err) {
      console.error("Error eliminando cierre:", err)
    }
  }

  const exportarPDF = (cierre) => {
    const contenido = `
FISCALCR — CIERRE DE MES
========================
Período: ${cierre.mes}
Usuario: ${usuario.nombre}

RESUMEN IVA
-----------
IVA Ventas:   ${fmt(cierre.iva_ventas)}
IVA Compras:  ${fmt(cierre.iva_compras)}
IVA Neto:     ${fmt(cierre.iva_neto)}

Estado: ${cierre.estado.toUpperCase()}
${cierre.fecha_declarado ? `Declarado el: ${cierre.fecha_declarado}` : ""}

Generado por FiscalCR — fiscalcr.pages.dev
    `.trim()

    const blob = new Blob([contenido], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `FiscalCR-Cierre-${cierre.mes}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const estadoBadge = (estado) => {
    if (estado === "declarado") return "bg-green-100 text-green-700"
    if (estado === "pagado") return "bg-blue-100 text-blue-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const nombreMes = (mes) => {
    const [year, month] = mes.split("-")
    const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    return `${nombres[parseInt(month) - 1]} ${year}`
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
            <h2 className="text-2xl font-bold text-gray-800">Historial de cierres</h2>
            <p className="text-gray-500 text-sm">Declaraciones mensuales de IVA</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={mesSeleccionado}
              max={mesActual}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
            />
            <button
              onClick={() => generarCierre(mesSeleccionado)}
              disabled={generando || !mesSeleccionado}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              {generando ? "Generando..." : `+ Cerrar ${nombreMes(mesSeleccionado)}`}
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="text-gray-500">Cargando historial...</p>
        ) : cierres.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-lg mb-2">No hay cierres registrados</p>
            <p className="text-gray-400 text-sm mb-4">Elegí el mes arriba y generá tu primer cierre</p>
            <button
              onClick={() => generarCierre(mesSeleccionado)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
              Generar primer cierre
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cierres.map((cierre) => (
              <div key={cierre.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{nombreMes(cierre.mes)}</h3>
                    {cierre.fecha_declarado && (
                      <p className="text-xs text-gray-400">Declarado el {cierre.fecha_declarado}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${estadoBadge(cierre.estado)}`}>
                    {cierre.estado.charAt(0).toUpperCase() + cierre.estado.slice(1)}
                  </span>
                </div>

                {/* Montos */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-500 mb-1">IVA Ventas</p>
                    <p className="font-bold text-blue-700">{fmt(cierre.iva_ventas)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-500 mb-1">IVA Compras</p>
                    <p className="font-bold text-green-700">{fmt(cierre.iva_compras)}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-indigo-500 mb-1">IVA Neto a pagar</p>
                    <p className="font-bold text-indigo-700">{fmt(cierre.iva_neto)}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => exportarPDF(cierre)}
                    className="text-sm bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-200 transition">
                    📄 Exportar
                  </button>
                  {cierre.estado === "pendiente" && (
                    <button
                      onClick={() => cambiarEstado(cierre.id, "declarado")}
                      className="text-sm bg-green-100 text-green-700 px-4 py-1.5 rounded-lg hover:bg-green-200 transition">
                      ✅ Marcar declarado
                    </button>
                  )}
                  {cierre.estado === "declarado" && (
                    <button
                      onClick={() => cambiarEstado(cierre.id, "pagado")}
                      className="text-sm bg-blue-100 text-blue-700 px-4 py-1.5 rounded-lg hover:bg-blue-200 transition">
                      💰 Marcar pagado
                    </button>
                  )}
                  {cierre.estado !== "pendiente" && (
                    <button
                      onClick={() => cambiarEstado(cierre.id, "pendiente")}
                      className="text-sm bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-lg hover:bg-yellow-200 transition">
                      ↩ Revertir
                    </button>
                  )}
                  <button
                    onClick={() => eliminarCierre(cierre.id, cierre.mes)}
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
