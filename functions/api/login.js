export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Correo y contraseña requeridos" }, { status: 400 })
    }

    const user = await env.fiscalcr_db.prepare(
      "SELECT * FROM usuarios WHERE email = ?"
    ).bind(email).first()

    if (!user) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    if (user.password !== password) {
      return Response.json({ error: "Contraseña incorrecta" }, { status: 401 })
    }

    return Response.json({
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email
      }
    })

  } catch (error) {
    return Response.json({ error: "Error del servidor" }, { status: 500 })
  }
}