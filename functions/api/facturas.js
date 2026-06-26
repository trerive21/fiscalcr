export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, facturas } = await request.json()

    if (!usuario_id || !facturas || facturas.length === 0) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    for (const factura of facturas) {
      await env.fiscalcr_db.prepare(`
        INSERT INTO facturas (usuario_id, tipo, numero, fecha, monto_neto, monto_iva, porcentaje_iva)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        usuario_id,
        factura.tipo || "venta",
        factura.numero || "N/D",
        factura.fecha || new Date().toISOString().substring(0, 10),
        factura.montoNeto,
        factura.montoIVA,
        factura.porcentajeIVA
      ).run()
    }

    return Response.json({ ok: true, mensaje: `${facturas.length} factura(s) guardada(s)` })

  } catch (error) {
    return Response.json({ error: "Error al guardar facturas" }, { status: 500 })
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    const facturas = await env.fiscalcr_db.prepare(`
      SELECT * FROM facturas 
      WHERE usuario_id = ? 
      ORDER BY fecha DESC
    `).bind(usuario_id).all()

    return Response.json({ ok: true, facturas: facturas.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener facturas" }, { status: 500 })
  }
}