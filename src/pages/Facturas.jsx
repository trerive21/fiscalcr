import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Facturas() {
  const [tab, setTab] = useState("ventas")
  const [archivos, setArchivos] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [resultados, setResultados] = useState([])
  const [guardado, setGuardado] = useState(false)
  const navigate = useNavigate()

  const handleArchivos = (e) => {
    const files = Array.from(e.target.files)
    setArchivos(files)
    setResultados([])
    setGuardado(false)
  }

  const parsearXML = (xmlText, nombreArchivo) => {
    try {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlText, "text/xml")
      const get = (tag) => xml.getElementsByTagName(tag)[0]?.textContent?.trim() || ""

      const numero = get("NumeroConsecutivo") || get("ClaveNumerica") || "N/D"
      const fecha = get("FechaEmision")?.substring(0, 10) || "N/D"
      const nombreEmisor = get("NombreEmisor") || get("Nombre") || "N/D"
      const montoTotal = parseFloat(get("TotalComprobante") || get("MontoTotalVenta") || 0)

      const impuestos = xml.getElementsByTagName("Impuesto")
      let totalIVA = 0
      let porcentajeIVA = 13

      if (impuestos.length > 0) {
        for (let imp of impuestos) {
          const monto = parseFloat(imp.getElementsByTagName("Monto")[0]?.textContent || 0)
          const tarifa = parseFloat(imp.getElementsByTagName("Tarifa")[0]?.textContent || 13)
          totalIVA += monto
          porcentajeIVA = tarifa
        }
      } else {
        totalIVA = montoTotal - (montoTotal / 1.13)
      }

      const montoNeto = montoTotal - totalIVA

      return {
        archivo: nombreArchivo,
        numero,
        fecha,
        emisor: nombreEmisor,
        montoTotal,
        montoNeto: parseFloat(montoNeto.toFixed(2)),
        montoIVA: parseFloat(totalIVA.toFixed(2)),
        porcentajeIVA,
        ok: true
      }
    } catch (err) {
      return { archivo: nombreArchivo, ok: false, error: "Error al leer el XML" }
    }
  }

  const procesarFacturas = async () => {
    if (archivos.length === 0) return
    setProcesando(true)
    const res = []

    for (const archivo of archivos) {
      const texto = await archivo.text()
      const resultado = parsearXML(texto, archivo.name)
      res.push(resultado)
    }

    setResultados(res)

    try {
      const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
      const facturasValidas = res.filter(r => r.ok && r.montoIVA > 0)

      if (facturasValidas.length > 0 && usuario.id) {
        const response = await fetch("/api/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario_id: usuario.id,
            tipo: tab,
            facturas: facturasValidas
          })
        })
        if (response.ok) setGuardado(true)
      }
    } catch (err) {
      console.error("Error guardando facturas:", err)
    }

    setProcesando(false)
  }

  const limpiar = () => {
    setArchivos([])
    setResultados([])
    setGuardado(false)
  }

  const totalIVA = resultados.filter(r => r.ok).reduce((acc, r) => acc + r.montoIVA, 0)
  const totalNeto = resultados.filter(r => r.ok).reduce((acc, r) => acc + r.montoNeto, 0)

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

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Facturas electrónicas</h2>
        <p className="text-gray-500 text-sm mb-6">Cargá tus facturas de ventas y compras por separado</p>

        {/* Pestañas */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab("ventas"); limpiar() }}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition ${
              tab === "ventas"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}>
            📤 Ventas
          </button>
          <button
            onClick={() => { setTab("compras"); limpiar() }}
            className={`px-6 py-2 rounded-lg font-medium text-sm transition ${
              tab === "compras"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}>
            📥 Compras
          </button>
        </div>

        {/* Indicador de tipo */}
        <div className={`rounded-xl px-4 py-3 mb-6 text-sm font-medium ${
          tab === "ventas" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
        }`}>
          {tab === "ventas"
            ? "📤 Estás cargando facturas de VENTAS — IVA que cobraste a tus clientes"
            : "📥 Estás cargando facturas de COMPRAS — IVA que pagaste a tus proveedores"}
        </div>

        {/* Zona de carga */}
        <div className={`bg-white rounded-xl border-2 border-dashed p-10 text-center mb-6 ${
          tab === "ventas" ? "border-blue-300" : "border-green-300"
        }`}>
          <p className="text-gray-400 mb-4 text-sm">Arrastrá tus archivos XML aquí o hacé click para seleccionar</p>
          <input
            type="file"
            accept=".xml"
            multiple
            onChange={handleArchivos}
            className="hidden"
            id="fileInput"
          />
          <label htmlFor="fileInput" className={`cursor-pointer text-white px-6 py-2 rounded-lg font-medium transition ${
            tab === "ventas" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
          }`}>
            Seleccionar archivos XML
          </label>
          {archivos.length > 0 && (
            <p className="mt-4 text-sm text-green-600 font-medium">
              {archivos.length} archivo(s) seleccionado(s)
            </p>
          )}
        </div>

        {/* Botón procesar */}
        {archivos.length > 0 && !guardado && (
          <button
            onClick={procesarFacturas}
            disabled={procesando}
            className={`w-full text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 mb-6 ${
              tab === "ventas" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
            }`}>
            {procesando ? "Procesando..." : `Procesar ${tab}`}
          </button>
        )}

        {/* Mensaje guardado */}
        {guardado && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm font-medium">
            ✅ Facturas guardadas correctamente en la base de datos
          </div>
        )}

        {/* Resultados */}
        {resultados.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total monto neto</p>
                <p className="text-2xl font-bold text-gray-800">
                  ₡{totalNeto.toLocaleString("es-CR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`rounded-xl p-5 shadow-sm border ${
                tab === "ventas" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
              }`}>
                <p className={`text-sm mb-1 ${tab === "ventas" ? "text-blue-600" : "text-green-600"}`}>
                  Total IVA {tab === "ventas" ? "cobrado" : "pagado"}
                </p>
                <p className={`text-2xl font-bold ${tab === "ventas" ? "text-blue-700" : "text-green-700"}`}>
                  ₡{totalIVA.toLocaleString("es-CR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Archivo</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Emisor</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Neto</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">IVA %</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">IVA ₡</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      {r.ok ? (
                        <>
                          <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{r.archivo}</td>
                          <td className="px-4 py-3 text-gray-600">{r.fecha}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.emisor}</td>
                          <td className="px-4 py-3 text-right text-gray-800">₡{r.montoNeto.toLocaleString("es-CR")}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              tab === "ventas" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>{r.porcentajeIVA}%</span>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${
                            tab === "ventas" ? "text-blue-700" : "text-green-700"
                          }`}>₡{r.montoIVA.toLocaleString("es-CR")}</td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-4 py-3 text-red-500">{r.archivo} — {r.error}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}