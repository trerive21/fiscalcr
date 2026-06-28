// Registrar actividad
export async function logActividad(env, usuario_id, accion, detalle = "", empresa_id = null, ip = "") {
  try {
    await env.fiscalcr_db.prepare(`
      INSERT INTO actividad_log (usuario_id, empresa_id, accion, detalle, ip)
      VALUES (?, ?, ?, ?, ?)
    `).bind(usuario_id, empresa_id, accion, detalle, ip).run()
  } catch (err) {
    console.error("Error registrando actividad:", err)
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const accion = url.searchParams.get("accion")
    const usuario_id = url.searchParams.get("usuario_id")

    // Listar usuarios
    if (accion === "usuarios") {
      const usuarios = await env.fiscalcr_db.prepare(`
        SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC
      `).all()
      return Response.json({ ok: true, usuarios: usuarios.results })
    }

    // Log de actividad
    if (accion === "log") {
      const log = await env.fiscalcr_db.prepare(`
        SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
        FROM actividad_log a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `).all()
      return Response.json({ ok: true, log: log.results })
    }

    // Listar empresas
    if (accion === "empresas") {
      const empresas = await env.fiscalcr_db.prepare(`
        SELECT * FROM empresas ORDER BY nombre ASC
      `).all()
      return Response.json({ ok: true, empresas: empresas.results })
    }

    // Usuarios de una empresa
    if (accion === "usuarios_empresa" && usuario_id) {
      const usuarios = await env.fiscalcr_db.prepare(`
        SELECT ue.*, u.nombre, u.email, u.rol, u.activo
        FROM usuarios_empresas ue
        LEFT JOIN usuarios u ON ue.usuario_id = u.id
        WHERE ue.empresa_id = ?
      `).bind(usuario_id).all()
      return Response.json({ ok: true, usuarios: usuarios.results })
    }

    return Response.json({ error: "Accion no válida" }, { status: 400 })

  } catch (error) {
    return Response.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { accion } = body

    // Crear empresa
    if (accion === "crear_empresa") {
      const { nombre, cedula, correo, telefono, direccion } = body
      if (!nombre) return Response.json({ error: "Nombre requerido" }, { status: 400 })

      await env.fiscalcr_db.prepare(`
        INSERT INTO empresas (nombre, cedula, correo, telefono, direccion)
        VALUES (?, ?, ?, ?, ?)
      `).bind(nombre, cedula || "", correo || "", telefono || "", direccion || "").run()

      return Response.json({ ok: true, mensaje: "Empresa creada exitosamente" })
    }

    // Crear usuario
    if (accion === "crear_usuario") {
      const { nombre, email, password, rol } = body
      if (!nombre || !email || !password) {
        return Response.json({ error: "Todos los campos son requeridos" }, { status: 400 })
      }

      const existe = await env.fiscalcr_db.prepare(
        "SELECT id FROM usuarios WHERE email = ?"
      ).bind(email).first()

      if (existe) {
        return Response.json({ error: "Este correo ya está registrado" }, { status: 400 })
      }

      await env.fiscalcr_db.prepare(`
        INSERT INTO usuarios (nombre, email, password, rol)
        VALUES (?, ?, ?, ?)
      `).bind(nombre, email, password, rol || "empleado").run()

      await logActividad(env, body.admin_id, "crear_usuario", `Usuario ${email} creado con rol ${rol}`)

      return Response.json({ ok: true, mensaje: "Usuario creado exitosamente" })
    }

    // Asignar usuario a empresa
    if (accion === "asignar_empresa") {
      const { usuario_id, empresa_id, rol } = body

      const existe = await env.fiscalcr_db.prepare(
        "SELECT id FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ?"
      ).bind(usuario_id, empresa_id).first()

      if (existe) {
        await env.fiscalcr_db.prepare(
          "UPDATE usuarios_empresas SET rol = ? WHERE usuario_id = ? AND empresa_id = ?"
        ).bind(rol || "empleado", usuario_id, empresa_id).run()
      } else {
        await env.fiscalcr_db.prepare(`
          INSERT INTO usuarios_empresas (usuario_id, empresa_id, rol)
          VALUES (?, ?, ?)
        `).bind(usuario_id, empresa_id, rol || "empleado").run()
      }

      return Response.json({ ok: true, mensaje: "Usuario asignado a empresa" })
    }

    return Response.json({ error: "Accion no válida" }, { status: 400 })

  } catch (error) {
    return Response.json({ error: "Error del servidor: " + error.message }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { accion, usuario_id, activo, rol, admin_id } = await request.json()

    // Bloquear/desbloquear usuario
    if (accion === "toggle_activo") {
      await env.fiscalcr_db.prepare(
        "UPDATE usuarios SET activo = ? WHERE id = ?"
      ).bind(activo, usuario_id).run()

      await logActividad(env, admin_id, activo ? "desbloquear_usuario" : "bloquear_usuario",
        `Usuario ID ${usuario_id} ${activo ? "desbloqueado" : "bloqueado"}`)

      return Response.json({ ok: true, mensaje: `Usuario ${activo ? "desbloqueado" : "bloqueado"}` })
    }

    // Cambiar rol
    if (accion === "cambiar_rol") {
      await env.fiscalcr_db.prepare(
        "UPDATE usuarios SET rol = ? WHERE id = ?"
      ).bind(rol, usuario_id).run()

      await logActividad(env, admin_id, "cambiar_rol", `Usuario ID ${usuario_id} cambiado a rol ${rol}`)

      return Response.json({ ok: true, mensaje: "Rol actualizado" })
    }

    return Response.json({ error: "Accion no válida" }, { status: 400 })

  } catch (error) {
    return Response.json({ error: "Error del servidor" }, { status: 500 })
  }
}