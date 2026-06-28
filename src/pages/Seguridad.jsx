import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Seguridad() {
  const [tab, setTab] = useState("usuarios")
  const [usuarios, setUsuarios] = useState([])
  const [log, setLog] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "empleado" })
  const [formEmpresa, setFormEmpresa] = useState({ nombre: "", cedula: "", correo: "", telefono: "", direccion: "" })
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")

  const cargarDatos = async () => {
    try {
      setCargando(true)
      const [uRes, lRes, eRes] = await Promise.all([
        fetch("/api/seguridad?accion=usuarios"),
        fetch("/api/seguridad?accion=log"),
        fetch("/api/seguridad?accion=empresas")
      ])
      const [uData, lData, eData] = await Promise.all([uRes.json(), lRes.json(), eRes.json()])
      if (uData.ok) setUsuarios(uData.usuarios)
      if (lData.ok) setLog(lData.log)
      if (eData.ok) setEmpresas(eData.empresas)
    } catch (err) {
      console.error("Error cargando datos:", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!usuario.id) { navigate("/"); return }
    cargarDatos()
  }, [])

  const crearUsuario = async () => {
    if (!form.nombre || !form.email || !form.password) return
    setGuardando(true)
    try {
      const res = await fetch("/api/seguridad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "crear_usuario", ...form, admin_id: usuario.id })
      })
      const data = await res.json()
      if (data.ok) { await cargarDatos(); setModal(null); setForm({ nombre: "", email: "", password: "", rol: "empleado" }) }
      else alert(data.error)
    } catch (err) {
      console.error("Error creando usuario:", err)
    } finally {
      setGuardando(false)
    }
  }

  const crearEmpresa = async () => {
    if (!formEmpresa.nombre) return
    setGuardando(true)
    try {
      const res = await fetch("/api/seguridad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "crear_empresa", ...formEmpresa })
      })
      const data = await res.json()
      if (data.ok) { await cargarDatos(); setModal(null); setFormEmpresa({ nombre: "", cedula: "", correo: "", telefono: "", direccion: "" }) }
    } catch (err) {
      console.error("Error creando empresa:", err)
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (uid, activo) => {
    await fetch("/api/seguridad", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "toggle_activo", usuario_id: uid, activo: activo ? 0 : 1, admin_id: usuario.id })
    })
    await cargarDatos()
  }

  const cambiarRol = async (uid, rol) => {
    await fetch("/api/seguridad", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "cambiar_rol", usuario_id: uid, rol, admin_id: usuario.id })
    })
    await cargarDatos()
  }

  const rolBadge = (rol) => {
    if (rol === "admin") return "bg-red-100 text-red-700"
    if (rol === "contador") return "bg-blue-100 text-blue-700"
    return "bg-gray-100 text-gray-600"
  }

  const accionIcon = (accion) => {
    if (accion?.includes("login")) return "🔑"
    if (accion?.includes("crear")) return "✅"
    if (accion?.includes("bloquear")) return "🔒"
    if (accion?.includes("desbloquear")) return "🔓"
    if (accion?.includes("rol")) return "👑"
    return "📋"
  }

  const formatFecha = (fecha) => {
    if (!fecha) return ""
    return new Date(fecha).toLocaleString("es-CR")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">FiscalCR</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-blue-600 hover:underline">← Dashboard</button>
          <button onClick={() => { localStorage.removeItem("usuario"); navigate("/") }} className="text-sm text-red-500 hover:underline">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Seguridad</h2>
            <p className="text-gray-500 text-sm">Gestión de usuarios, empresas y actividad</p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "usuarios", label: "👥 Usuarios" },
            { id: "empresas", label: "🏢 Empresas" },
            { id: "actividad", label: "📋 Actividad" }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition ${
                tab === t.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {cargando ? <p className="text-gray-500">Cargando...</p> : (
          <>
            {/* USUARIOS */}
            {tab === "usuarios" && (
              <>
                <div className="flex justify-end mb-4">
                  <button onClick={() => setModal("usuario")}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                    + Nuevo usuario
                  </button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Correo</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Rol</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(u => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                          <td className="px-4 py-3 text-gray-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <select value={u.rol || "empleado"} onChange={e => cambiarRol(u.id, e.target.value)}
                              disabled={u.id === usuario.id}
                              className={`text-xs px-2 py-1 rounded-lg border-0 font-medium ${rolBadge(u.rol)} disabled:opacity-50`}>
                              <option value="admin">Admin</option>
                              <option value="contador">Contador</option>
                              <option value="empleado">Empleado</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              u.activo !== 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {u.activo !== 0 ? "Activo" : "Bloqueado"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {u.id !== usuario.id && (
                              <button onClick={() => toggleActivo(u.id, u.activo !== 0)}
                                className={`text-xs px-3 py-1.5 rounded-lg ${
                                  u.activo !== 0
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-green-50 text-green-700 hover:bg-green-100"
                                }`}>
                                {u.activo !== 0 ? "🔒 Bloquear" : "🔓 Activar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* EMPRESAS */}
            {tab === "empresas" && (
              <>
                <div className="flex justify-end mb-4">
                  <button onClick={() => setModal("empresa")}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                    + Nueva empresa
                  </button>
                </div>
                {empresas.length === 0 ? (
                  <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
                    <p className="text-gray-400 text-lg mb-2">No hay empresas registradas</p>
                    <button onClick={() => setModal("empresa")}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm mt-2">
                      Agregar primera empresa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {empresas.map(e => (
                      <div key={e.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-1">{e.nombre}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                          {e.cedula && <p className="text-xs text-gray-500">🪪 {e.cedula}</p>}
                          {e.correo && <p className="text-xs text-gray-500">✉️ {e.correo}</p>}
                          {e.telefono && <p className="text-xs text-gray-500">📞 {e.telefono}</p>}
                          {e.direccion && <p className="text-xs text-gray-500">📍 {e.direccion}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ACTIVIDAD */}
            {tab === "actividad" && (
              <>
                {log.length === 0 ? (
                  <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
                    <p className="text-gray-400">No hay actividad registrada todavía</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Acción</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Usuario</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Detalle</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.map(l => (
                          <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-800">{accionIcon(l.accion)} {l.accion}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{l.usuario_nombre || "Sistema"}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{l.detalle}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatFecha(l.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal nuevo usuario */}
      {modal === "usuario" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo usuario</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre completo *" value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="email" placeholder="Correo electrónico *" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="password" placeholder="Contraseña *" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="empleado">👤 Empleado</option>
                <option value="contador">📊 Contador</option>
                <option value="admin">👑 Administrador</option>
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                Cancelar
              </button>
              <button onClick={crearUsuario} disabled={guardando || !form.nombre || !form.email || !form.password}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50">
                {guardando ? "Guardando..." : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva empresa */}
      {modal === "empresa" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nueva empresa</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre de la empresa *" value={formEmpresa.nombre}
                onChange={e => setFormEmpresa({...formEmpresa, nombre: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="text" placeholder="Cédula jurídica" value={formEmpresa.cedula}
                onChange={e => setFormEmpresa({...formEmpresa, cedula: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="email" placeholder="Correo" value={formEmpresa.correo}
                onChange={e => setFormEmpresa({...formEmpresa, correo: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="text" placeholder="Teléfono" value={formEmpresa.telefono}
                onChange={e => setFormEmpresa({...formEmpresa, telefono: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="text" placeholder="Dirección" value={formEmpresa.direccion}
                onChange={e => setFormEmpresa({...formEmpresa, direccion: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                Cancelar
              </button>
              <button onClick={crearEmpresa} disabled={guardando || !formEmpresa.nombre}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50">
                {guardando ? "Guardando..." : "Crear empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}