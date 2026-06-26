import { useState } from "react"

export default function Dashboard() {
  const [mes] = useState("Junio 2026")

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">FiscalCR</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">Hola, Luis</span>
          <button className="text-sm text-red-500 hover:underline">Cerrar sesión</button>
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
            <p className="text-2xl font-bold text-gray-800">₡845.200</p>
            <p className="text-xs text-gray-400 mt-1">23 facturas</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">IVA pagado (compras)</p>
            <p className="text-2xl font-bold text-gray-800">₡312.500</p>
            <p className="text-xs text-gray-400 mt-1">14 facturas</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-200 bg-blue-50">
            <p className="text-sm text-blue-600 mb-1">IVA neto a pagar</p>
            <p className="text-2xl font-bold text-blue-700">₡532.700</p>
            <p className="text-xs text-blue-400 mt-1">Listo para D-150</p>
          </div>
        </div>

        {/* Desglose por tarifa */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Desglose por tarifa de IVA</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">13% estándar</span>
                <span className="font-medium text-gray-800">₡720.400</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: "85%"}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">4% reducido</span>
                <span className="font-medium text-gray-800">₡89.600</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: "30%"}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">1% transitorio</span>
                <span className="font-medium text-gray-800">₡35.200</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{width: "12%"}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Exento</span>
                <span className="text-gray-400">₡0</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-gray-300 h-2 rounded-full" style={{width: "0%"}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón generar reporte */}
        <button className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
          Generar reporte para TRIBU-CR
        </button>

      </div>
    </div>
  )
}