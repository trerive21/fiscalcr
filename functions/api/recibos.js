export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")
    const id = url.searchParams.get("id")

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    if (id) {
      const recibo = await env.fiscalcr_db.prepare(`
        SELECT r.*, c.nombre as cliente_nombre, c.cedula as cliente_cedula,
        c.correo as cliente_correo, c.direccion as cliente_direccion
        FROM recibos r LEFT JOIN clientes c ON r.cliente_id = c.id
        WHERE r.id = ? AND r.usuario_id = ?
      `).bind(id, usuario_id).first()

      const detalle = await env.fiscalcr_db.prepare(`
        SELECT * FROM recibos_detalle WHERE recibo_id = ?
      `).bind(id).all()

      return Response.json({ ok: true, recibo, detalle: detalle.results })
    }

    const recibos = await env.fiscalcr_db.prepare(`
      SELECT r.*, c.nombre as cliente_nombre
      FROM recibos r LEFT JOIN clientes c ON r.cliente_id = c.id
      WHERE r.usuario_id = ? ORDER BY r.created_at DESC
    `).bind(usuario_id).all()

    return Response.json({ ok: true, recibos: recibos.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener recibos" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, cliente_id, fecha, notas, lineas } = await request.json()

    if (!usuario_id || !lineas || lineas.length === 0) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    let subtotal = 0
    let monto_iva = 0
    for (const linea of lineas) {
      const sub = linea.cantidad * linea.precio_unitario
      const iva = sub * (linea.porcentaje_iva / 100)
      subtotal += sub
      monto_iva += iva
    }
    const total = subtotal + monto_iva

    const count = await env.fiscalcr_db.prepare(
      "SELECT COUNT(*) as total FROM recibos WHERE usuario_id = ?"
    ).bind(usuario_id).first()
    const numero = `REC-${String((count.total || 0) + 1).padStart(4, "0")}`

    const result = await env.fiscalcr_db.prepare(`
      INSERT INTO recibos (usuario_id, cliente_id, numero, fecha, notas, subtotal, monto_iva, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(usuario_id, cliente_id || null, numero, fecha, notas || "", subtotal, monto_iva, total).run()

    const recibo_id = result.meta.last_row_id

    for (const linea of lineas) {
      const sub = linea.cantidad * linea.precio_unitario
      const iva = sub * (linea.porcentaje_iva / 100)
      await env.fiscalcr_db.prepare(`
        INSERT INTO recibos_detalle (recibo_id, articulo_id, descripcion, cantidad, precio_unitario, porcentaje_iva, monto_iva, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(recibo_id, linea.articulo_id || null, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.porcentaje_iva, iva, sub).run()
    }

    return Response.json({ ok: true, numero, recibo_id })

  } catch (error) {
    return Response.json({ error: "Error al crear recibo" }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { id, estado } = await request.json()

    if (!id || !estado) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(
      "UPDATE recibos SET estado = ? WHERE id = ?"
    ).bind(estado, id).run()

    return Response.json({ ok: true, mensaje: "Estado actualizado" })

  } catch (error) {
    return Response.json({ error: "Error al actualizar recibo" }, { status: 500 })
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return Response.json({ error: "id requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare("DELETE FROM recibos_detalle WHERE recibo_id = ?").bind(id).run()
    await env.fiscalcr_db.prepare("DELETE FROM recibos WHERE id = ?").bind(id).run()

    return Response.json({ ok: true, mensaje: "Recibo eliminado" })

  } catch (error) {
    return Response.json({ error: "Error al eliminar recibo" }, { status: 500 })
  }
}