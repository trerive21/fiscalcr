import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState("")
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre: "", cedula: "", correo: "", telefono: "", direccion: "", condicion_iva: "gravado"
  })
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")

  const cargarClientes = async (texto = "") => {
    try {
      const url = `/api/clientes?usuario_id=${usuario.id}${texto ? `&buscar=${texto}` : ""}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.ok) setClientes(data.clientes)
    } catch (err) {
      console.error("Error cargando clientes:", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!usuario.id) { navigate("/"); return }
    cargarClientes()
  }, [])

  const handleBuscar = (e) => {
    setBuscar(e.target.value)
    cargarClientes(e.target.value)
  }

  const abrirModal = (cliente = null) => {
    if (cliente) {
      setEditando(cliente)
      setForm({
        nombre: cliente.nombre,
        cedula: cliente.cedula,
        correo: cliente.correo,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        condicion_iva: cliente.condicion_iva
      })
    } else {
      setEditando(null)
      setForm({ nombre: "", cedula: "", correo: "", telefono: "", direccion: "", condicion_iva: "gravado" })
    }
    setModal(true)
  }

  const cerrarModal = () => {
    setModal(false)
    setEditando(null)
  }

  const guardarCliente = async () => {
    if (!form.nombre) return
    setGuardando(true)
    try {
      if (editando) {
        await fetch("/api/clientes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editando.id, ...form })
        })
      } else {
        await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: usuario.id, ...form })
        })
      }
      await cargarClientes()
      cerrarModal()
    } catch (err) {
      console.error("Error guardando cliente:", err)
    } finally {
      setGuardando(false)
    }
  }

  const eliminarCliente = async (id) => {
    if (!confirm("¿Seguro que querés eliminar este cliente?")) return
    try {
      await fetch(`/api/clientes?id=${id}`, { method: "DELETE" })
      await cargarClientes()
    } catch (err) {
      console.error("Error eliminando cliente:", err)
    }
  }

  const condicionBadge = (condicion) => {
    if (condicion === "exento") return "bg-gray-100 text-gray-600"
    if (condicion === "no_sujeto") return "bg-purple-100 text-purple-600"
    return "bg-blue-100 text-blue-600"
  }

  const condicionLabel = (condicion) => {
    if (condicion === "exento") return "Exento"
    if (condicion === "no_sujeto") return "No sujeto"
    return "Gravado"
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

        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
            <p className="text-gray-500 text-sm">{clientes.length} cliente(s) registrado(s)</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Nuevo cliente
          </button>
        </div>

        {/* Buscador */}
        <input
          type="text"
          value={buscar}
          onChange={handleBuscar}
          placeholder="Buscar por nombre, cédula o correo..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />

        {/* Lista de clientes */}
        {cargando ? (
          <p className="text-gray-500">Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-lg mb-2">No hay clientes registrados</p>
            <button
              onClick={() => abrirModal()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm mt-2">
              Agregar primer cliente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {clientes.map((cliente) => (
              <div key={cliente.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-800">{cliente.nombre}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${condicionBadge(cliente.condicion_iva)}`}>
                      {condicionLabel(cliente.condicion_iva)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {cliente.cedula && <p className="text-xs text-gray-500">🪪 {cliente.cedula}</p>}
                    {cliente.correo && <p className="text-xs text-gray-500">✉️ {cliente.correo}</p>}
                    {cliente.telefono && <p className="text-xs text-gray-500">📞 {cliente.telefono}</p>}
                    {cliente.direccion && <p className="text-xs text-gray-500">📍 {cliente.direccion}</p>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => abrirModal(cliente)}
                    className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => eliminarCliente(cliente.id)}
                    className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo/editar cliente */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editando ? "Editar cliente" : "Nuevo cliente"}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre completo *"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Cédula / RUC"
                value={form.cedula}
                onChange={e => setForm({...form, cedula: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={form.correo}
                onChange={e => setForm({...form, correo: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Dirección"
                value={form.direccion}
                onChange={e => setForm({...form, direccion: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={form.condicion_iva}
                onChange={e => setForm({...form, condicion_iva: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="gravado">Gravado (paga IVA)</option>
                <option value="exento">Exento de IVA</option>
                <option value="no_sujeto">No sujeto a IVA</option>
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={cerrarModal}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                Cancelar
              </button>
              <button
                onClick={guardarCliente}
                disabled={guardando || !form.nombre}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50">
                {guardando ? "Guardando..." : editando ? "Actualizar" : "Guardar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}