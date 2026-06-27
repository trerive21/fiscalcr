import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Proformas() {
  const [proformas, setProformas] = useState([])
  const [clientes, setClientes] = useState([])
  const [articulos, setArticulos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState("lista")
  const [proformaDetalle, setProformaDetalle] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
  const fmt = (n) => `₡${(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`

  const [form, setForm] = useState({
    cliente_id: "", fecha: new Date().toISOString().substring(0, 10),
    validez: 30, notas: "", lineas: []
  })

  const lineaVacia = { descripcion: "", cantidad: 1, precio_unitario: "", porcentaje_iva: 13, articulo_id: null }

  const cargarDatos = async () => {
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        fetch(`/api/proformas?usuario_id=${usuario.id}`),
        fetch(`/api/clientes?usuario_id=${usuario.id}`),
        fetch(`/api/articulos?usuario_id=${usuario.id}`)
      ])
      const [pData, cData, aData] = await Promise.all([pRes.json(), cRes.json(), aRes.json()])
      if (pData.ok) setProformas(pData.proformas)
      if (cData.ok) setClientes(cData.clientes)
      if (aData.ok) setArticulos(aData.articulos)
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

  const agregarLinea = () => {
    setForm({ ...form, lineas: [...form.lineas, { ...lineaVacia }] })
  }

  const actualizarLinea = (i, campo, valor) => {
    const lineas = [...form.lineas]
    lineas[i] = { ...lineas[i], [campo]: valor }
    if (campo === "articulo_id" && valor) {
      const art = articulos.find(a => a.id === parseInt(valor))
      if (art) {
        lineas[i].descripcion = art.nombre
        lineas[i].precio_unitario = art.precio
        lineas[i].porcentaje_iva = art.porcentaje_iva
        lineas[i].articulo_id = art.id
      }
    }
    setForm({ ...form, lineas })
  }

  const eliminarLinea = (i) => {
    const lineas = form.lineas.filter((_, idx) => idx !== i)
    setForm({ ...form, lineas })
  }

  const calcularLinea = (linea) => {
    const sub = (linea.cantidad || 0) * (linea.precio_unitario || 0)
    const iva = sub * ((linea.porcentaje_iva || 0) / 100)
    return { sub, iva, total: sub + iva }
  }

  const totales = form.lineas.reduce((acc, l) => {
    const { sub, iva, total } = calcularLinea(l)
    return { subtotal: acc.subtotal + sub, iva: acc.iva + iva, total: acc.total + total }
  }, { subtotal: 0, iva: 0, total: 0 })

  const guardarProforma = async () => {
    if (form.lineas.length === 0) return
    setGuardando(true)
    try {
      const res = await fetch("/api/proformas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id, ...form })
      })
      const data = await res.json()
      if (data.ok) {
        await cargarDatos()
        setVista("lista")
        setForm({ cliente_id: "", fecha: new Date().toISOString().substring(0, 10), validez: 30, notas: "", lineas: [] })
      }
    } catch (err) {
      console.error("Error guardando proforma:", err)
    } finally {
      setGuardando(false)
    }
  }

  const verDetalle = async (id) => {
    const res = await fetch(`/api/proformas?usuario_id=${usuario.id}&id=${id}`)
    const data = await res.json()
    if (data.ok) { setProformaDetalle(data); setVista("detalle") }
  }

  const cambiarEstado = async (id, estado) => {
    await fetch("/api/proformas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado })
    })
    await cargarDatos()
    if (proformaDetalle) {
      const res = await fetch(`/api/proformas?usuario_id=${usuario.id}&id=${id}`)
      const data = await res.json()
      if (data.ok) setProformaDetalle(data)
    }
  }

  const eliminarProforma = async (id) => {
    if (!confirm("¿Seguro que querés eliminar esta proforma?")) return
    await fetch(`/api/proformas?id=${id}`, { method: "DELETE" })
    await cargarDatos()
    setVista("lista")
  }

  const exportarProforma = (p, detalle) => {
    const cliente = clientes.find(c => c.id === p.cliente_id)
    const lineas = detalle.map(d =>
      `  ${d.descripcion} x${d.cantidad} @ ${fmt(d.precio_unitario)} = ${fmt(d.subtotal)} + IVA ${fmt(d.monto_iva)}`
    ).join("\n")

    const contenido = `
FISCALCR — PROFORMA
===================
Número: ${p.numero}
Fecha: ${p.fecha}
Válida por: ${p.validez} días

CLIENTE
-------
${p.cliente_nombre || "Sin cliente"}
${cliente?.cedula ? `Cédula: ${cliente.cedula}` : ""}
${cliente?.correo ? `Correo: ${cliente.correo}` : ""}
${cliente?.direccion ? `Dirección: ${cliente.direccion}` : ""}

DETALLE
-------
${lineas}

TOTALES
-------
Subtotal:  ${fmt(p.subtotal)}
IVA:       ${fmt(p.monto_iva)}
TOTAL:     ${fmt(p.total)}

${p.notas ? `Notas: ${p.notas}` : ""}

Generado por FiscalCR — fiscalcr.pages.dev
    `.trim()

    const blob = new Blob([contenido], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Proforma-${p.numero}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const estadoBadge = (estado) => {
    if (estado === "aprobada") return "bg-green-100 text-green-700"
    if (estado === "rechazada") return "bg-red-100 text-red-700"
    if (estado === "facturada") return "bg-blue-100 text-blue-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">FiscalCR</h1>
        <div className="flex items-center gap-4">
          {vista !== "lista" && (
            <button onClick={() => setVista("lista")} className="text-sm text-blue-600 hover:underline">
              ← Proformas
            </button>
          )}
          <button onClick={() => navigate("/dashboard")} className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </button>
          <button onClick={() => { localStorage.removeItem("usuario"); navigate("/") }} className="text-sm text-red-500 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* LISTA */}
        {vista === "lista" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Proformas</h2>
                <p className="text-gray-500 text-sm">{proformas.length} proforma(s)</p>
              </div>
              <button
                onClick={() => { setForm({ cliente_id: "", fecha: new Date().toISOString().substring(0, 10), validez: 30, notas: "", lineas: [{ ...lineaVacia }] }); setVista("nueva") }}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                + Nueva proforma
              </button>
            </div>

            {cargando ? <p className="text-gray-500">Cargando...</p> : proformas.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 text-lg mb-2">No hay proformas</p>
                <button onClick={() => setVista("nueva")} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm mt-2">
                  Crear primera proforma
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {proformas.map(p => (
                  <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-gray-800">{p.numero}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge(p.estado)}`}>
                          {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{p.cliente_nombre || "Sin cliente"} — {p.fecha}</p>
                      <p className="text-sm font-medium text-blue-700 mt-1">{fmt(p.total)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => verDetalle(p.id)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                        👁️ Ver
                      </button>
                      <button onClick={() => eliminarProforma(p.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* NUEVA PROFORMA */}
        {vista === "nueva" && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva proforma</h2>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-semibold text-gray-700 mb-4">Datos generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Cliente</label>
                  <select
                    value={form.cliente_id}
                    onChange={e => setForm({...form, cliente_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Sin cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Validez (días)</label>
                  <input type="number" value={form.validez} onChange={e => setForm({...form, validez: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Notas</label>
                  <input type="text" placeholder="Condiciones, observaciones..." value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Líneas de detalle</h3>
                <button onClick={agregarLinea} className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                  + Agregar línea
                </button>
              </div>

              {form.lineas.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No hay líneas. Agregá al menos una.</p>
              ) : (
                <div className="space-y-3">
                  {form.lineas.map((linea, i) => {
                    const { sub, iva, total } = calcularLinea(linea)
                    return (
                      <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                          <div className="md:col-span-2">
                            <select onChange={e => actualizarLinea(i, "articulo_id", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="">Seleccionar artículo...</option>
                              {articulos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                            <input type="text" placeholder="Descripción *" value={linea.descripcion}
                              onChange={e => actualizarLinea(i, "descripcion", e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <input type="number" placeholder="Cantidad" value={linea.cantidad}
                              onChange={e => actualizarLinea(i, "cantidad", parseFloat(e.target.value) || 1)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input type="number" placeholder="Precio unitario" value={linea.precio_unitario}
                              onChange={e => actualizarLinea(i, "precio_unitario", parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <select value={linea.porcentaje_iva} onChange={e => actualizarLinea(i, "porcentaje_iva", parseFloat(e.target.value))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="13">13%</option>
                              <option value="4">4%</option>
                              <option value="2">2%</option>
                              <option value="1">1%</option>
                              <option value="0">Exento</option>
                            </select>
                            <button onClick={() => eliminarLinea(i)} className="w-full text-sm bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100">
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-end gap-4 text-xs text-gray-500">
                          <span>Subtotal: {fmt(sub)}</span>
                          <span>IVA: {fmt(iva)}</span>
                          <span className="font-medium text-gray-700">Total: {fmt(total)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {form.lineas.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
                <div className="flex justify-end">
                  <div className="space-y-1 text-sm w-64">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span><span>{fmt(totales.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA:</span><span>{fmt(totales.iva)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-800 border-t pt-1">
                      <span>TOTAL:</span><span>{fmt(totales.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setVista("lista")} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={guardarProforma} disabled={guardando || form.lineas.length === 0}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar proforma"}
              </button>
            </div>
          </>
        )}

        {/* DETALLE */}
        {vista === "detalle" && proformaDetalle && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{proformaDetalle.proforma.numero}</h2>
                <p className="text-gray-500 text-sm">{proformaDetalle.proforma.fecha} — válida {proformaDetalle.proforma.validez} días</p>
              </div>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${estadoBadge(proformaDetalle.proforma.estado)}`}>
                {proformaDetalle.proforma.estado.charAt(0).toUpperCase() + proformaDetalle.proforma.estado.slice(1)}
              </span>
            </div>

            {proformaDetalle.proforma.cliente_nombre && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Cliente</h3>
                <p className="text-gray-800 font-medium">{proformaDetalle.proforma.cliente_nombre}</p>
                {proformaDetalle.proforma.cliente_cedula && <p className="text-sm text-gray-500">Cédula: {proformaDetalle.proforma.cliente_cedula}</p>}
                {proformaDetalle.proforma.cliente_correo && <p className="text-sm text-gray-500">Correo: {proformaDetalle.proforma.cliente_correo}</p>}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Descripción</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Cant.</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Precio</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">IVA</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {proformaDetalle.detalle.map((d, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-800">{d.descripcion}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{d.cantidad}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(d.precio_unitario)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(d.monto_iva)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(d.subtotal + d.monto_iva)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
              <div className="flex justify-end">
                <div className="space-y-1 text-sm w-64">
                  <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{fmt(proformaDetalle.proforma.subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>IVA:</span><span>{fmt(proformaDetalle.proforma.monto_iva)}</span></div>
                  <div className="flex justify-between font-bold text-gray-800 border-t pt-1"><span>TOTAL:</span><span>{fmt(proformaDetalle.proforma.total)}</span></div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => exportarProforma(proformaDetalle.proforma, proformaDetalle.detalle)}
                className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                📄 Exportar
              </button>
              {proformaDetalle.proforma.estado === "pendiente" && (
                <button onClick={() => cambiarEstado(proformaDetalle.proforma.id, "aprobada")}
                  className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200">
                  ✅ Marcar aprobada
                </button>
              )}
              {proformaDetalle.proforma.estado === "aprobada" && (
                <button onClick={() => cambiarEstado(proformaDetalle.proforma.id, "facturada")}
                  className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200">
                  🧾 Marcar facturada
                </button>
              )}
              {proformaDetalle.proforma.estado === "pendiente" && (
                <button onClick={() => cambiarEstado(proformaDetalle.proforma.id, "rechazada")}
                  className="text-sm bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">
                  ❌ Rechazar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}