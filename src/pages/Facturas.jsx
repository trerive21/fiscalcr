import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Facturas() {
  const [archivos, setArchivos] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [resultados, setResultados] = useState([])
  const navigate = useNavigate()

  const handleArchivos = (e) => {
    const files = Array.from(e.target.files)
    setArchivos(files)
    setResultados([])
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

      // Buscar líneas de detalle para extraer IVA
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
    setProcesando(false)
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
          <button className="text-sm text-red-500 hover:underline">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cargar facturas XML</h2>
        <p className="text-gray-500 text-sm mb-6">Seleccioná uno o varios archivos XML de facturas electrónicas</p>

        {/* Zona de carga */}
        <div className="bg-white rounded-xl border-2 border-dashed border-blue-300 p-10 text-center mb-6">
          <p className="text-gray-400 mb-4 text-sm">Arrastrá tus archivos XML aquí o hacé click para seleccionar</p>
          <input
            type="file"
            accept=".xml"
            multiple
            onChange={handleArchivos}
            className="hidden"
            id="fileInput"
          />
          <label htmlFor="fileInput" className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
            Seleccionar archivos XML
          </label>
          {archivos.length > 0 && (
            <p className="mt-4 text-sm text-green-600 font-medium">
              {archivos.length} archivo(s) seleccionado(s)
            </p>
          )}
        </div>

        {/* Botón procesar */}
        {archivos.length > 0 && (
          <button
            onClick={procesarFacturas}
            disabled={procesando}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 mb-6"
          >
            {procesando ? "Procesando..." : "Procesar facturas"}
          </button>
        )}

        {/* Resultados */}
        {resultados.length > 0 && (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total monto neto</p>
                <p className="text-2xl font-bold text-gray-800">
                  ₡{totalNeto.toLocaleString("es-CR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-5 shadow-sm border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Total IVA</p>
                <p className="text-2xl font-bold text-blue-700">
                  ₡{totalIVA.toLocaleString("es-CR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Tabla de facturas */}
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
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{r.porcentajeIVA}%</span>
                          </td>
                          <td className="px-4 py-3 text-right text-blue-700 font-medium">₡{r.montoIVA.toLocaleString("es-CR")}</td>
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