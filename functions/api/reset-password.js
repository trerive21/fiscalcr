export async function onRequestPost({ request, env }) {
  try {
    const { action, email, token, password } = await request.json()

    // PASO 1: Solicitar reset
    if (action === "solicitar") {
      const usuario = await env.fiscalcr_db.prepare(
        "SELECT * FROM usuarios WHERE email = ?"
      ).bind(email).first()

      if (!usuario) {
        return Response.json({ ok: true, mensaje: "Si el correo existe recibirás instrucciones" })
      }

      // Generar token único
      const token = crypto.randomUUID()
      const expira = new Date(Date.now() + 3600000).toISOString() // 1 hora

      await env.fiscalcr_db.prepare(`
        INSERT INTO reset_tokens (usuario_id, token, expira) VALUES (?, ?, ?)
      `).bind(usuario.id, token, expira).run()

      // Enviar correo con Resend
      const resetUrl = `https://fiscalcr.pages.dev/reset?token=${token}`

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: "FiscalCR <onboarding@resend.dev>",
          to: email,
          subject: "Recuperación de contraseña — FiscalCR",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1d4ed8;">FiscalCR</h2>
              <p>Hola <strong>${usuario.nombre}</strong>,</p>
              <p>Recibimos una solicitud para restablecer tu contraseña.</p>
              <p>Hacé click en el botón para continuar:</p>
              <a href="${resetUrl}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Restablecer contraseña
              </a>
              <p style="color: #666; font-size: 13px;">Este enlace expira en 1 hora.</p>
              <p style="color: #666; font-size: 13px;">Si no solicitaste esto, ignorá este correo.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">FiscalCR — Gestión tributaria simplificada</p>
            </div>
          `
        })
      })

      return Response.json({ ok: true, mensaje: "Si el correo existe recibirás instrucciones" })
    }

    // PASO 2: Verificar token
    if (action === "verificar") {
      const resetToken = await env.fiscalcr_db.prepare(`
        SELECT * FROM reset_tokens WHERE token = ? AND usado = 0 AND expira > datetime('now')
      `).bind(token).first()

      if (!resetToken) {
        return Response.json({ ok: false, error: "Token inválido o expirado" }, { status: 400 })
      }

      return Response.json({ ok: true })
    }

    // PASO 3: Cambiar contraseña
    if (action === "cambiar") {
      const resetToken = await env.fiscalcr_db.prepare(`
        SELECT * FROM reset_tokens WHERE token = ? AND usado = 0 AND expira > datetime('now')
      `).bind(token).first()

      if (!resetToken) {
        return Response.json({ ok: false, error: "Token inválido o expirado" }, { status: 400 })
      }

      await env.fiscalcr_db.prepare(
        "UPDATE usuarios SET password = ? WHERE id = ?"
      ).bind(password, resetToken.usuario_id).run()

      await env.fiscalcr_db.prepare(
        "UPDATE reset_tokens SET usado = 1 WHERE id = ?"
      ).bind(resetToken.id).run()

      return Response.json({ ok: true, mensaje: "Contraseña actualizada exitosamente" })
    }

    return Response.json({ error: "Acción no válida" }, { status: 400 })

  } catch (error) {
    return Response.json({ error: "Error del servidor" }, { status: 500 })
  }
}