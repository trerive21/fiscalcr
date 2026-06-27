import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Articulos() {
  const [articulos, setArticulos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState("")
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre: "", descripcion: "", precio: "", porcentaje_iva: "13", unidad: "unidad"
  })
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")

  const cargarArticulos = async (texto = "") => {
    try {
      const url = `/api/articulos?usuario_id=${usuario.id}${texto ? `&buscar=${texto}` : ""}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.ok) setArticulos(data.articulos)
    } catch (err) {
      console.error("Error cargando artículos:", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!usuario.id) { navigate("/"); return }
    cargarArticulos()
  }, [])

  const handleBuscar = (e) => {
    setBuscar(e.target.value)
    cargarArticulos(e.target.value)
  }

  const abrirModal = (articulo = null) => {
    if (articulo) {
      setEditando(articulo)
      setForm({
        nombre: articulo.nombre,
        descripcion: articulo.descripcion || "",
        precio: articulo.precio,
        porcentaje_iva: articulo.porcentaje_iva,
        unidad: articulo.unidad
      })
    } else {
      setEditando(null)
      setForm({ nombre: "", descripcion: "", precio: "", porcentaje_iva: "13", unidad: "unidad" })
    }
    setModal(true)
  }

  const cerrarModal = () => { setModal(false); setEditando(null) }

  const guardarArticulo = async () => {
    if (!form.nombre || form.precio === "") return
    setGuardando(true)
    try {
      if (editando) {
        await fetch("/api/articulos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editando.id, ...form, precio: parseFloat(form.precio), porcentaje_iva: parseFloat(form.porcentaje_iva) })
        })
      } else {
        await fetch("/api/articulos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: usuario.id, ...form, precio: parseFloat(form.precio), porcentaje_iva: parseFloat(form.porcentaje_iva) })
        })
      }
      await cargarArticulos()
      cerrarModal()
    } catch (err) {
      console.error("Error guardando artículo:", err)
    } finally {
      setGuardando(false)
    }
  }

  const eliminarArticulo = async (id) => {
    if (!confirm("¿Seguro que querés eliminar este artículo?")) return
    try {
      await fetch(`/api/articulos?id=${id}`, { method: "DELETE" })
      await cargarArticulos()
    } catch (err) {
      console.error("Error eliminando artículo:", err)
    }
  }

  const fmt = (n) => `₡${(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`

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

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Artículos / Servicios</h2>
            <p className="text-gray-500 text-sm">{articulos.length} artículo(s) registrado(s)</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Nuevo artículo
          </button>
        </div>

        <input
          type="text"
          value={buscar}
          onChange={handleBuscar}
          placeholder="Buscar artículo o servicio..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />

        {cargando ? (
          <p className="text-gray-500">Cargando artículos...</p>
        ) : articulos.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-lg mb-2">No hay artículos registrados</p>
            <button
              onClick={() => abrirModal()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm mt-2">
              Agregar primer artículo
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Unidad</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Precio</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">IVA</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Precio con IVA</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articulos.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{a.nombre}</p>
                      {a.descripcion && <p className="text-xs text-gray-400">{a.descripcion}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.unidad}</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmt(a.precio)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{a.porcentaje_iva}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {fmt(a.precio * (1 + a.porcentaje_iva / 100))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => abrirModal(a)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200">
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminarArticulo(a.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editando ? "Editar artículo" : "Nuevo artículo / servicio"}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre *"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Descripción"
                value={form.descripcion}
                onChange={e => setForm({...form, descripcion: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="number"
                placeholder="Precio sin IVA *"
                value={form.precio}
                onChange={e => setForm({...form, precio: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={form.porcentaje_iva}
                onChange={e => setForm({...form, porcentaje_iva: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="13">13% estándar</option>
                <option value="4">4% reducido</option>
                <option value="2">2% reducido</option>
                <option value="1">1% transitorio</option>
                <option value="0">Exento</option>
              </select>
              <select
                value={form.unidad}
                onChange={e => setForm({...form, unidad: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="unidad">Unidad</option>
                <option value="servicio">Servicio</option>
                <option value="hora">Hora</option>
                <option value="mes">Mes</option>
                <option value="kg">Kg</option>
                <option value="litro">Litro</option>
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={cerrarModal} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                Cancelar
              </button>
              <button
                onClick={guardarArticulo}
                disabled={guardando || !form.nombre || form.precio === ""}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50">
                {guardando ? "Guardando..." : editando ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}