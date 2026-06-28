import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function FacturaElectronica() {
  const [clientes, setClientes] = useState([])
  const [articulos, setArticulos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [vista, setVista] = useState("lista")
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
  const fmt = (n) => `₡${(n || 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`

  const [form, setForm] = useState({
    cliente_id: "", notas: "", lineas: []
  })

  const lineaVacia = { descripcion: "", cantidad: 1, precio_unitario: "", porcentaje_iva: 13, unidad: "Sp", articulo_id: null }

  const cargarDatos = async () => {
    try {
      const [cRes, aRes, fRes] = await Promise.all([
        fetch(`/api/clientes?usuario_id=${usuario.id}`),
        fetch(`/api/articulos?usuario_id=${usuario.id}`),
        fetch(`/api/factura-electronica?usuario_id=${usuario.id}`)
      ])
      const [cData, aData, fData] = await Promise.all([cRes.json(), aRes.json(), fRes.json()])
      if (cData.ok) setClientes(cData.clientes)
      if (aData.ok) setArticulos(aData.articulos)
      if (fData.ok) setFacturas(fData.facturas)
    } catch (err) {
      console.error("Error cargando datos:", err)
    }
  }

  useEffect(() => {
    if (!usuario.id) { navigate("/"); return }
    cargarDatos()
  }, [])

  const agregarLinea = () => setForm({ ...form, lineas: [...form.lineas, { ...lineaVacia }] })

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

  const eliminarLinea = (i) => setForm({ ...form, lineas: form.lineas.filter((_, idx) => idx !== i) })

  const calcularLinea = (linea) => {
    const sub = (linea.cantidad || 0) * (linea.precio_unitario || 0)
    const iva = sub * ((linea.porcentaje_iva || 0) / 100)
    return { sub, iva, total: sub + iva }
  }

  const totales = form.lineas.reduce((acc, l) => {
    const { sub, iva, total } = calcularLinea(l)
    return { subtotal: acc.subtotal + sub, iva: acc.iva + iva, total: acc.total + total }
  }, { subtotal: 0, iva: 0, total: 0 })

  const generarFactura = async () => {
    if (form.lineas.length === 0) return
    setGuardando(true)
    try {
      const cliente = clientes.find(c => c.id === parseInt(form.cliente_id))
      const res = await fetch("/api/factura-electronica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuario.id,
          cliente: cliente || null,
          lineas: form.lineas,
          notas: form.notas
        })
      })
      const data = await res.json()
      if (data.ok) {
        setResultado(data)
        setVista("resultado")
        await cargarDatos()
      } else {
        alert("Error: " + data.error)
      }
    } catch (err) {
      console.error("Error generando factura:", err)
    } finally {
      setGuardando(false)
    }
  }

  const descargarXML = (xml, clave) => {
    const blob = new Blob([xml], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Factura-${clave}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const estadoBadge = (estado) => {
    if (estado === "aceptada") return "bg-green-100 text-green-700"
    if (estado === "rechazada") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">FiscalCR</h1>
        <div className="flex items-center gap-4">
          {vista !== "lista" && (
            <button onClick={() => { setVista("lista"); setResultado(null) }} className="text-sm text-blue-600 hover:underline">
              ← Facturas
            </button>
          )}
          <button onClick={() => navigate("/dashboard")} className="text-sm text-blue-600 hover:underline">← Dashboard</button>
          <button onClick={() => { localStorage.removeItem("usuario"); navigate("/") }} className="text-sm text-red-500 hover:underline">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* LISTA */}
        {vista === "lista" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Facturas electrónicas</h2>
                <p className="text-gray-500 text-sm">{facturas.length} factura(s) generada(s)</p>
              </div>
              <button
                onClick={() => { setForm({ cliente_id: "", notas: "", lineas: [{ ...lineaVacia }] }); setVista("nueva") }}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                + Nueva factura
              </button>
            </div>

            {facturas.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 text-lg mb-2">No hay facturas electrónicas</p>
                <button onClick={() => setVista("nueva")} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm mt-2">
                  Generar primera factura
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Consecutivo</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map((f) => (
                      <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{f.consecutivo}</td>
                        <td className="px-4 py-3 text-gray-600">{f.cliente_nombre || "Sin cliente"}</td>
                        <td className="px-4 py-3 text-gray-600">{f.fecha?.substring(0, 10)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(f.total)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge(f.estado)}`}>
                            {f.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* NUEVA FACTURA */}
        {vista === "nueva" && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva factura electrónica</h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
              ⚠️ Esta factura será generada con tu clave criptográfica de Hacienda. Verificá bien los datos antes de generar.
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-semibold text-gray-700 mb-4">Datos del receptor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Cliente</label>
                  <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Consumidor final</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Notas</label>
                  <input type="text" placeholder="Observaciones..." value={form.notas}
                    onChange={e => setForm({...form, notas: e.target.value})}
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
                <p className="text-gray-400 text-sm text-center py-4">Agregá al menos una línea.</p>
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
                    <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{fmt(totales.subtotal)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>IVA:</span><span>{fmt(totales.iva)}</span></div>
                    <div className="flex justify-between font-bold text-gray-800 border-t pt-1"><span>TOTAL:</span><span>{fmt(totales.total)}</span></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setVista("lista")} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={generarFactura} disabled={guardando || form.lineas.length === 0}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {guardando ? "Generando..." : "⚡ Generar factura electrónica"}
              </button>
            </div>
          </>
        )}

        {/* RESULTADO */}
        {vista === "resultado" && resultado && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6">
              <h3 className="font-bold text-green-800 text-lg mb-1">✅ Factura generada exitosamente</h3>
              <p className="text-green-700 text-sm">Clave: <span className="font-mono text-xs">{resultado.clave}</span></p>
              <p className="text-green-700 text-sm">Consecutivo: {resultado.consecutivo}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                <p className="text-xl font-bold text-gray-800">{fmt(resultado.subtotal)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">IVA</p>
                <p className="text-xl font-bold text-gray-800">{fmt(resultado.totalIVA)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Total</p>
                <p className="text-xl font-bold text-blue-700">{fmt(resultado.total)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => descargarXML(resultado.xml, resultado.clave)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                📥 Descargar XML
              </button>
              <button onClick={() => { setVista("nueva"); setForm({ cliente_id: "", notas: "", lineas: [{ ...lineaVacia }] }); setResultado(null) }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                + Nueva factura
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}