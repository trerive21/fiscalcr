import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Dashboard() {
  const [mes] = useState("Junio 2026")
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
        if (!usuario.id) { navigate("/"); return }

        const res = await fetch(`/api/facturas?usuario_id=${usuario.id}`)
        const data = await res.json()

        if (data.ok) {
          const facturas = data.facturas || []

          const ventas = facturas.filter(f => f.tipo === "venta")
          const compras = facturas.filter(f => f.tipo === "compra")

          const ivaVentas = ventas.reduce((acc, f) => acc + f.monto_iva, 0)
          const ivaCompras = compras.reduce((acc, f) => acc + f.monto_iva, 0)
          const ivaNeto = ivaVentas - ivaCompras

          const por13 = facturas.filter(f => f.porcentaje_iva === 13).reduce((acc, f) => acc + f.monto_iva, 0)
          const por4 = facturas.filter(f => f.porcentaje_iva === 4).reduce((acc, f) => acc + f.monto_iva, 0)
          const por2 = facturas.filter(f => f.porcentaje_iva === 2).reduce((acc, f) => acc + f.monto_iva, 0)
          const por1 = facturas.filter(f => f.porcentaje_iva === 1).reduce((acc, f) => acc + f.monto_iva, 0)
          const maxIVA = Math.max(por13, por4, por2, por1, 1)

          setDatos({ ivaVentas, ivaCompras, ivaNeto, por13, por4, por2, por1, maxIVA, totalFacturas: facturas.length })
        }
      } catch (err) {
        console.error("Error cargando datos:", err)
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [navigate])

  const fmt = (n) => `₡${(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`
  const pct = (n, max) => `${Math.round((n / max) * 100)}%`

  const cerrarSesion = () => {
    localStorage.removeItem("usuario")
    navigate("/")
  }

  if (cargando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando datos...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">FiscalCR</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">
            Hola, {JSON.parse(localStorage.getItem("usuario") || "{}").nombre || "Usuario"}
          </span>
          <button onClick={cerrarSesion} className="text-sm text-red-500 hover:underline">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Resumen IVA</h2>
            <p className="text-gray-500 text-sm">{mes}</p>
          </div>
          <span className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1 rounded-full font-medium">
            Vence 15 jul
          </span>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">IVA cobrado (ventas)</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(datos?.ivaVentas)}</p>
            <p className="text-xs text-gray-400 mt-1">{datos?.totalFacturas || 0} facturas</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">IVA pagado (compras)</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(datos?.ivaCompras)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-5 shadow-sm border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">IVA neto a pagar</p>
            <p className="text-2xl font-bold text-blue-700">{fmt(datos?.ivaNeto)}</p>
            <p className="text-xs text-blue-400 mt-1">Listo para D-150</p>
          </div>
        </div>

        {/* Desglose por tarifa */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Desglose por tarifa de IVA</h3>
          <div className="space-y-4">
            {[
              { label: "13% estándar", valor: datos?.por13, color: "bg-blue-500" },
              { label: "4% reducido", valor: datos?.por4, color: "bg-green-500" },
              { label: "2% reducido", valor: datos?.por2, color: "bg-purple-500" },
              { label: "1% transitorio", valor: datos?.por1, color: "bg-yellow-500" },
            ].map(({ label, valor, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-medium text-gray-800">{fmt(valor)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all`}
                    style={{ width: valor ? pct(valor, datos?.maxIVA) : "0%" }}>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botón cargar facturas */}
        <button
          onClick={() => navigate("/facturas")}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
          Cargar facturas XML
        </button>

      </div>
    </div>
  )
}