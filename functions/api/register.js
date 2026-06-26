export async function onRequestPost({ request, env }) {
  try {
    const { nombre, email, password } = await request.json()

    if (!nombre || !email || !password) {
      return Response.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const existe = await env.fiscalcr_db.prepare(
      "SELECT id FROM usuarios WHERE email = ?"
    ).bind(email).first()

    if (existe) {
      return Response.json({ error: "Este correo ya está registrado" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(
      "INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)"
    ).bind(nombre, email, password).run()

    return Response.json({ ok: true, mensaje: "Usuario creado exitosamente" })

  } catch (error) {
    return Response.json({ error: "Error del servidor" }, { status: 500 })
  }
}