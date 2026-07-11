import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const NOMBRES_MES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function Dashboard() {
  const [mesActivo, setMesActivo] = useState(null) // formato "2026-07"
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  const nombreMes = (mesStr) => {
    if (!mesStr) return ""
    const [year, month] = mesStr.split("-")
    return `${NOMBRES_MES[parseInt(month) - 1]} ${year}`
  }

  const sumarMes = (mesStr, cantidad) => {
    const [year, month] = mesStr.split("-").map(Number)
    const fecha = new Date(year, month - 1 + cantidad, 1)
    return fecha.toISOString().substring(0, 7)
  }

  const calcularVencimiento = (mesStr) => {
    if (!mesStr) return ""
    const [, month] = sumarMes(mesStr, 1).split("-")
    return `15 ${NOMBRES_MES[parseInt(month) - 1].substring(0, 3).toLowerCase()}`
  }

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
        if (!usuario.id) { navigate("/"); return }

        // 1. Determinar el mes activo: el mes siguiente al último cierre declarado/pagado.
        //    Si no hay cierres previos, se usa el mes calendario anterior como valor por defecto.
        let mesCalculado
        try {
          const resCierres = await fetch(`/api/cierres?usuario_id=${usuario.id}`)
          const dataCierres = await resCierres.json()
          const cierresCerrados = (dataCierres.cierres || [])
            .filter(c => c.estado === "declarado" || c.estado === "pagado")
            .sort((a, b) => b.mes.localeCompare(a.mes)) // más reciente primero

          if (cierresCerrados.length > 0) {
            mesCalculado = sumarMes(cierresCerrados[0].mes, 1)
          } else {
            const hoy = new Date()
            hoy.setMonth(hoy.getMonth() - 1)
            mesCalculado = hoy.toISOString().substring(0, 7)
          }
        } catch {
          const hoy = new Date()
          hoy.setMonth(hoy.getMonth() - 1)
          mesCalculado = hoy.toISOString().substring(0, 7)
        }
        setMesActivo(mesCalculado)

        // 2. Traer las facturas y filtrar SOLO las del mes activo
        const res = await fetch(`/api/facturas?usuario_id=${usuario.id}`)
        const data = await res.json()

        if (data.ok) {
          const todasFacturas = data.facturas || []
          const facturas = todasFacturas.filter(f => (f.fecha || "").startsWith(mesCalculado))

          const ventas = facturas.filter(f => f.tipo === "ventas" || f.tipo === "venta")
          const compras = facturas.filter(f => f.tipo === "compras" || f.tipo === "compra")

          // Ventas
          const ivaVentas = ventas.reduce((acc, f) => acc + f.monto_iva, 0)
          const netoVentas = ventas.reduce((acc, f) => acc + f.monto_neto, 0)
          const totalVentas = ventas.reduce((acc, f) => acc + f.monto_neto + f.monto_iva, 0)

          // Compras
          const ivaCompras = compras.reduce((acc, f) => acc + f.monto_iva, 0)
          const netoCompras = compras.reduce((acc, f) => acc + f.monto_neto, 0)
          const totalCompras = compras.reduce((acc, f) => acc + f.monto_neto + f.monto_iva, 0)

          // IVA neto
          const ivaNeto = ivaVentas - ivaCompras

          // Desglose por tarifa
          const por13 = facturas.filter(f => f.porcentaje_iva === 13).reduce((acc, f) => acc + f.monto_iva, 0)
          const por4 = facturas.filter(f => f.porcentaje_iva === 4).reduce((acc, f) => acc + f.monto_iva, 0)
          const por2 = facturas.filter(f => f.porcentaje_iva === 2).reduce((acc, f) => acc + f.monto_iva, 0)
          const por1 = facturas.filter(f => f.porcentaje_iva === 1).reduce((acc, f) => acc + f.monto_iva, 0)
          const maxIVA = Math.max(por13, por4, por2, por1, 1)

          setDatos({
            ivaVentas, netoVentas, totalVentas,
            ivaCompras, netoCompras, totalCompras,
            ivaNeto, por13, por4, por2, por1, maxIVA,
            totalFacturasVentas: ventas.length,
            totalFacturasCompras: compras.length
          })
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
            <p className="text-gray-500 text-sm">{nombreMes(mesActivo)}</p>
          </div>
          <span className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1 rounded-full font-medium">
            Vence {calcularVencimiento(mesActivo)}
          </span>
        </div>

        {/* SECCIÓN 1 — Resumen comparativo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">📊 Resumen comparativo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-600 mb-1">IVA cobrado (ventas)</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(datos?.ivaVentas)}</p>
              <p className="text-xs text-blue-400 mt-1">{datos?.totalFacturasVentas || 0} facturas</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-sm text-green-600 mb-1">IVA pagado (compras)</p>
              <p className="text-2xl font-bold text-green-700">{fmt(datos?.ivaCompras)}</p>
              <p className="text-xs text-green-400 mt-1">{datos?.totalFacturasCompras || 0} facturas</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <p className="text-sm text-indigo-600 mb-1">IVA neto a pagar</p>
              <p className="text-2xl font-bold text-indigo-700">{fmt(datos?.ivaNeto)}</p>
              <p className="text-xs text-indigo-400 mt-1">Listo para D-150</p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2 — Detalle Ventas */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">📤 Detalle de Ventas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500 mb-1">Monto sin IVA</p>
              <p className="text-xl font-bold text-gray-800">{fmt(datos?.netoVentas)}</p>
            </div>
            <div className="rounded-xl p-4 border border-blue-100 bg-blue-50">
              <p className="text-sm text-blue-500 mb-1">IVA total cobrado</p>
              <p className="text-xl font-bold text-blue-700">{fmt(datos?.ivaVentas)}</p>
            </div>
            <div className="rounded-xl p-4 border border-blue-200 bg-blue-100">
              <p className="text-sm text-blue-600 mb-1">Monto total con IVA</p>
              <p className="text-xl font-bold text-blue-800">{fmt(datos?.totalVentas)}</p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3 — Detalle Compras */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">📥 Detalle de Compras</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500 mb-1">Monto sin IVA</p>
              <p className="text-xl font-bold text-gray-800">{fmt(datos?.netoCompras)}</p>
            </div>
            <div className="rounded-xl p-4 border border-green-100 bg-green-50">
              <p className="text-sm text-green-500 mb-1">IVA total pagado</p>
              <p className="text-xl font-bold text-green-700">{fmt(datos?.ivaCompras)}</p>
            </div>
            <div className="rounded-xl p-4 border border-green-200 bg-green-100">
              <p className="text-sm text-green-600 mb-1">Monto total con IVA</p>
              <p className="text-xl font-bold text-green-800">{fmt(datos?.totalCompras)}</p>
            </div>
          </div>
        </div>

        {/* Desglose por tarifa */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">📋 Desglose por tarifa de IVA</h3>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <button onClick={() => navigate("/factura-electronica")}
            className="bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition text-sm">
            ⚡ Factura electrónica
          </button>
          <button onClick={() => navigate("/recibos")}
            className="bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition text-sm">
            🧾 Recibos
          </button>
          <button onClick={() => navigate("/proformas")}
            className="bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition text-sm">
            📄 Proformas
          </button>
          <button onClick={() => navigate("/clientes")}
            className="bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition text-sm">
            👥 Clientes
          </button>
          <button onClick={() => navigate("/articulos")}
            className="bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition text-sm">
            📦 Artículos
          </button>
          <button onClick={() => navigate("/facturas")}
            className="bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition text-sm">
            📂 Facturas XML
          </button>
          <button onClick={() => navigate("/historial")}
            className="bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm">
            📋 Historial
          </button>
          <button onClick={() => navigate("/seguridad")}
            className="bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition text-sm">
            🔐 Seguridad
          </button>
          <button onClick={() => navigate("/renta")}
            className="bg-yellow-600 text-white py-3 rounded-xl font-semibold hover:bg-yellow-700 transition text-sm">
            📈 Renta Anual
          </button>
        </div>

      </div>
    </div>
  )
}
