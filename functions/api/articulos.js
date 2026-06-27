export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")
    const buscar = url.searchParams.get("buscar") || ""

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    let articulos
    if (buscar) {
      articulos = await env.fiscalcr_db.prepare(`
        SELECT * FROM articulos 
        WHERE usuario_id = ? AND (nombre LIKE ? OR descripcion LIKE ?)
        ORDER BY nombre ASC
      `).bind(usuario_id, `%${buscar}%`, `%${buscar}%`).all()
    } else {
      articulos = await env.fiscalcr_db.prepare(`
        SELECT * FROM articulos WHERE usuario_id = ? ORDER BY nombre ASC
      `).bind(usuario_id).all()
    }

    return Response.json({ ok: true, articulos: articulos.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener artículos" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, nombre, descripcion, precio, porcentaje_iva, unidad } = await request.json()

    if (!usuario_id || !nombre || precio === undefined) {
      return Response.json({ error: "Nombre y precio requeridos" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(`
      INSERT INTO articulos (usuario_id, nombre, descripcion, precio, porcentaje_iva, unidad)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(usuario_id, nombre, descripcion || "", precio, porcentaje_iva || 13, unidad || "unidad").run()

    return Response.json({ ok: true, mensaje: "Artículo creado exitosamente" })

  } catch (error) {
    return Response.json({ error: "Error al crear artículo" }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { id, nombre, descripcion, precio, porcentaje_iva, unidad } = await request.json()

    if (!id || !nombre || precio === undefined) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(`
      UPDATE articulos SET nombre=?, descripcion=?, precio=?, porcentaje_iva=?, unidad=? WHERE id=?
    `).bind(nombre, descripcion || "", precio, porcentaje_iva || 13, unidad || "unidad", id).run()

    return Response.json({ ok: true, mensaje: "Artículo actualizado" })

  } catch (error) {
    return Response.json({ error: "Error al actualizar artículo" }, { status: 500 })
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return Response.json({ error: "id requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare("DELETE FROM articulos WHERE id = ?").bind(id).run()

    return Response.json({ ok: true, mensaje: "Artículo eliminado" })

  } catch (error) {
    return Response.json({ error: "Error al eliminar artículo" }, { status: 500 })
  }
}