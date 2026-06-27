export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    const cierres = await env.fiscalcr_db.prepare(`
      SELECT * FROM cierres_mes 
      WHERE usuario_id = ? 
      ORDER BY mes DESC
    `).bind(usuario_id).all()

    return Response.json({ ok: true, cierres: cierres.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener cierres" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, mes } = await request.json()

    if (!usuario_id || !mes) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Calcular totales del mes desde las facturas
    const facturas = await env.fiscalcr_db.prepare(`
      SELECT tipo, monto_iva FROM facturas 
      WHERE usuario_id = ? AND strftime('%Y-%m', fecha) = ?
    `).bind(usuario_id, mes).all()

    const ventas = facturas.results.filter(f => f.tipo === "ventas" || f.tipo === "venta")
    const compras = facturas.results.filter(f => f.tipo === "compras" || f.tipo === "compra")

    const iva_ventas = ventas.reduce((acc, f) => acc + f.monto_iva, 0)
    const iva_compras = compras.reduce((acc, f) => acc + f.monto_iva, 0)
    const iva_neto = iva_ventas - iva_compras

    // Verificar si ya existe cierre para ese mes
    const existente = await env.fiscalcr_db.prepare(`
      SELECT id FROM cierres_mes WHERE usuario_id = ? AND mes = ?
    `).bind(usuario_id, mes).first()

    if (existente) {
      await env.fiscalcr_db.prepare(`
        UPDATE cierres_mes SET iva_ventas = ?, iva_compras = ?, iva_neto = ? WHERE id = ?
      `).bind(iva_ventas, iva_compras, iva_neto, existente.id).run()
    } else {
      await env.fiscalcr_db.prepare(`
        INSERT INTO cierres_mes (usuario_id, mes, iva_ventas, iva_compras, iva_neto)
        VALUES (?, ?, ?, ?, ?)
      `).bind(usuario_id, mes, iva_ventas, iva_compras, iva_neto).run()
    }

    return Response.json({ ok: true, mensaje: `Cierre de ${mes} generado`, iva_ventas, iva_compras, iva_neto })

  } catch (error) {
    return Response.json({ error: "Error al generar cierre" }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { cierre_id, estado } = await request.json()

    if (!cierre_id || !estado) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const fecha_declarado = estado === "declarado" ? new Date().toISOString().substring(0, 10) : null

    await env.fiscalcr_db.prepare(`
      UPDATE cierres_mes SET estado = ?, fecha_declarado = ? WHERE id = ?
    `).bind(estado, fecha_declarado, cierre_id).run()

    return Response.json({ ok: true, mensaje: "Estado actualizado" })

  } catch (error) {
    return Response.json({ error: "Error al actualizar estado" }, { status: 500 })
  }
}