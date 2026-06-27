export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")
    const id = url.searchParams.get("id")

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    if (id) {
      const proforma = await env.fiscalcr_db.prepare(`
        SELECT p.*, c.nombre as cliente_nombre, c.cedula as cliente_cedula, 
        c.correo as cliente_correo, c.direccion as cliente_direccion
        FROM proformas p LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE p.id = ? AND p.usuario_id = ?
      `).bind(id, usuario_id).first()

      const detalle = await env.fiscalcr_db.prepare(`
        SELECT * FROM proformas_detalle WHERE proforma_id = ?
      `).bind(id).all()

      return Response.json({ ok: true, proforma, detalle: detalle.results })
    }

    const proformas = await env.fiscalcr_db.prepare(`
      SELECT p.*, c.nombre as cliente_nombre
      FROM proformas p LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.usuario_id = ? ORDER BY p.created_at DESC
    `).bind(usuario_id).all()

    return Response.json({ ok: true, proformas: proformas.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener proformas" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, cliente_id, fecha, validez, notas, lineas } = await request.json()

    if (!usuario_id || !lineas || lineas.length === 0) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Calcular totales
    let subtotal = 0
    let monto_iva = 0
    for (const linea of lineas) {
      const sub = linea.cantidad * linea.precio_unitario
      const iva = sub * (linea.porcentaje_iva / 100)
      subtotal += sub
      monto_iva += iva
    }
    const total = subtotal + monto_iva

    // Generar número de proforma
    const count = await env.fiscalcr_db.prepare(
      "SELECT COUNT(*) as total FROM proformas WHERE usuario_id = ?"
    ).bind(usuario_id).first()
    const numero = `PRO-${String((count.total || 0) + 1).padStart(4, "0")}`

    // Insertar proforma
    const result = await env.fiscalcr_db.prepare(`
      INSERT INTO proformas (usuario_id, cliente_id, numero, fecha, validez, notas, subtotal, monto_iva, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(usuario_id, cliente_id || null, numero, fecha, validez || 30, notas || "", subtotal, monto_iva, total).run()

    const proforma_id = result.meta.last_row_id

    // Insertar líneas de detalle
    for (const linea of lineas) {
      const sub = linea.cantidad * linea.precio_unitario
      const iva = sub * (linea.porcentaje_iva / 100)
      await env.fiscalcr_db.prepare(`
        INSERT INTO proformas_detalle (proforma_id, articulo_id, descripcion, cantidad, precio_unitario, porcentaje_iva, monto_iva, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(proforma_id, linea.articulo_id || null, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.porcentaje_iva, iva, sub).run()
    }

    return Response.json({ ok: true, numero, proforma_id })

  } catch (error) {
    return Response.json({ error: "Error al crear proforma" }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { id, estado } = await request.json()

    if (!id || !estado) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(
      "UPDATE proformas SET estado = ? WHERE id = ?"
    ).bind(estado, id).run()

    return Response.json({ ok: true, mensaje: "Estado actualizado" })

  } catch (error) {
    return Response.json({ error: "Error al actualizar proforma" }, { status: 500 })
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return Response.json({ error: "id requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare("DELETE FROM proformas_detalle WHERE proforma_id = ?").bind(id).run()
    await env.fiscalcr_db.prepare("DELETE FROM proformas WHERE id = ?").bind(id).run()

    return Response.json({ ok: true, mensaje: "Proforma eliminada" })

  } catch (error) {
    return Response.json({ error: "Error al eliminar proforma" }, { status: 500 })
  }
}