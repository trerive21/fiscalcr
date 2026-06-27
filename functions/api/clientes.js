export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")
    const buscar = url.searchParams.get("buscar") || ""

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    let clientes
    if (buscar) {
      clientes = await env.fiscalcr_db.prepare(`
        SELECT * FROM clientes 
        WHERE usuario_id = ? AND (nombre LIKE ? OR cedula LIKE ? OR correo LIKE ?)
        ORDER BY nombre ASC
      `).bind(usuario_id, `%${buscar}%`, `%${buscar}%`, `%${buscar}%`).all()
    } else {
      clientes = await env.fiscalcr_db.prepare(`
        SELECT * FROM clientes WHERE usuario_id = ? ORDER BY nombre ASC
      `).bind(usuario_id).all()
    }

    return Response.json({ ok: true, clientes: clientes.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener clientes" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, nombre, cedula, correo, telefono, direccion, condicion_iva } = await request.json()

    if (!usuario_id || !nombre) {
      return Response.json({ error: "Nombre requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(`
      INSERT INTO clientes (usuario_id, nombre, cedula, correo, telefono, direccion, condicion_iva)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(usuario_id, nombre, cedula || "", correo || "", telefono || "", direccion || "", condicion_iva || "gravado").run()

    return Response.json({ ok: true, mensaje: "Cliente creado exitosamente" })

  } catch (error) {
    return Response.json({ error: "Error al crear cliente" }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { id, nombre, cedula, correo, telefono, direccion, condicion_iva } = await request.json()

    if (!id || !nombre) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(`
      UPDATE clientes SET nombre=?, cedula=?, correo=?, telefono=?, direccion=?, condicion_iva=? WHERE id=?
    `).bind(nombre, cedula || "", correo || "", telefono || "", direccion || "", condicion_iva || "gravado", id).run()

    return Response.json({ ok: true, mensaje: "Cliente actualizado" })

  } catch (error) {
    return Response.json({ error: "Error al actualizar cliente" }, { status: 500 })
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return Response.json({ error: "id requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare("DELETE FROM clientes WHERE id = ?").bind(id).run()

    return Response.json({ ok: true, mensaje: "Cliente eliminado" })

  } catch (error) {
    return Response.json({ error: "Error al eliminar cliente" }, { status: 500 })
  }
}
