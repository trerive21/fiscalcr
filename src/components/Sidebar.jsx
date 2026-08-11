import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"

const ITEMS = [
  { path: "/dashboard", icon: "📊", label: "Dashboard" },
  { path: "/factura-electronica", icon: "⚡", label: "Factura electrónica" },
  { path: "/recibos", icon: "🧾", label: "Recibos" },
  { path: "/proformas", icon: "📄", label: "Proformas" },
  { path: "/clientes", icon: "👥", label: "Clientes" },
  { path: "/articulos", icon: "📦", label: "Artículos" },
  { path: "/facturas", icon: "📂", label: "Facturas XML" },
  { path: "/historial", icon: "📋", label: "Historial" },
  { path: "/renta", icon: "📈", label: "Renta Anual" },
  { path: "/seguridad", icon: "🔐", label: "Seguridad" },
]

export default function Sidebar() {
  const [abierto, setAbierto] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Recordar el estado abierto/cerrado entre sesiones y entre páginas
  useEffect(() => {
    const guardado = localStorage.getItem("sidebarAbierto")
    if (guardado !== null) setAbierto(guardado === "true")
  }, [])

  const toggle = () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    localStorage.setItem("sidebarAbierto", String(nuevo))
  }

  return (
    <aside
      className={`sticky top-0 h-screen bg-white border-r border-gray-100 shadow-sm transition-all duration-200 flex flex-col shrink-0 ${
        abierto ? "w-56" : "w-16"
      }`}>
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
        {abierto && <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Menú</span>}
        <button
          onClick={toggle}
          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition ml-auto"
          title={abierto ? "Ocultar panel" : "Mostrar panel"}>
          {abierto ? "⏴" : "⏵"}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {ITEMS.map((item) => {
          const activo = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                activo
                  ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}>
              <span className="text-lg leading-none">{item.icon}</span>
              {abierto && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
