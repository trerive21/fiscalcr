// TRAMOS DEL IMPUESTO SOBRE LA RENTA - PERIODO FISCAL 2026
// Fuente: Decreto Ejecutivo 45333-H (Hacienda Costa Rica). Estos montos se
// ajustan cada año por el IPC - revisar y actualizar en enero de cada año.

function calcularImpuestoFisica(rentaNeta) {
  if (rentaNeta <= 0) return 0
  const tramos = [
    { limite: 6244000, tasa: 0 },
    { limite: 8329000, tasa: 0.10 },
    { limite: 10414000, tasa: 0.15 },
    { limite: 20872000, tasa: 0.20 },
    { limite: Infinity, tasa: 0.25 }
  ]
  let impuesto = 0
  let anterior = 0
  for (const tramo of tramos) {
    if (rentaNeta <= anterior) break
    const baseTramo = Math.min(rentaNeta, tramo.limite) - anterior
    impuesto += baseTramo * tramo.tasa
    anterior = tramo.limite
  }
  return Math.round(impuesto)
}

function calcularImpuestoJuridica(rentaNeta, ingresoBruto) {
  if (rentaNeta <= 0) return 0
  const UMBRAL_PYME = 119174000

  // Si el ingreso bruto anual supera el umbral, se aplica tarifa plana del 30%
  if (ingresoBruto > UMBRAL_PYME) {
    return Math.round(rentaNeta * 0.30)
  }

  // Escala reducida (PYME)
  const tramos = [
    { limite: 5621000, tasa: 0.05 },
    { limite: 8433000, tasa: 0.10 },
    { limite: 11243000, tasa: 0.15 },
    { limite: Infinity, tasa: 0.20 }
  ]
  let impuesto = 0
  let anterior = 0
  for (const tramo of tramos) {
    if (rentaNeta <= anterior) break
    const baseTramo = Math.min(rentaNeta, tramo.limite) - anterior
    impuesto += baseTramo * tramo.tasa
    anterior = tramo.limite
  }
  return Math.round(impuesto)
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    const declaraciones = await env.fiscalcr_db.prepare(`
      SELECT * FROM declaraciones_renta 
      WHERE usuario_id = ? 
      ORDER BY anio DESC
    `).bind(usuario_id).all()

    return Response.json({ ok: true, declaraciones: declaraciones.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener declaraciones de renta" }, { status: 500 })
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, anio, tipo_contribuyente } = await request.json()

    if (!usuario_id || !anio) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const tipo = tipo_contribuyente === "juridica" ? "juridica" : "fisica"

    // Solo se toman en cuenta los meses YA DECLARADOS o PAGADOS de ese año,
    // para que Renta refleje exactamente lo que ya se declaró de IVA cada mes.
    const cierres = await env.fiscalcr_db.prepare(`
      SELECT neto_ventas, neto_compras FROM cierres_mes 
      WHERE usuario_id = ? AND mes LIKE ? AND estado IN ('declarado', 'pagado')
    `).bind(usuario_id, `${anio}-%`).all()

    const ingreso_bruto = cierres.results.reduce((acc, c) => acc + (c.neto_ventas || 0), 0)
    const gastos_deducibles = cierres.results.reduce((acc, c) => acc + (c.neto_compras || 0), 0)
    const renta_neta = Math.max(0, ingreso_bruto - gastos_deducibles)

    const impuesto = tipo === "juridica"
      ? calcularImpuestoJuridica(renta_neta, ingreso_bruto)
      : calcularImpuestoFisica(renta_neta)

    const existente = await env.fiscalcr_db.prepare(`
      SELECT id FROM declaraciones_renta WHERE usuario_id = ? AND anio = ?
    `).bind(usuario_id, anio).first()

    if (existente) {
      await env.fiscalcr_db.prepare(`
        UPDATE declaraciones_renta 
        SET tipo_contribuyente = ?, ingreso_bruto = ?, gastos_deducibles = ?, renta_neta = ?, impuesto = ? 
        WHERE id = ?
      `).bind(tipo, ingreso_bruto, gastos_deducibles, renta_neta, impuesto, existente.id).run()
    } else {
      await env.fiscalcr_db.prepare(`
        INSERT INTO declaraciones_renta (usuario_id, anio, tipo_contribuyente, ingreso_bruto, gastos_deducibles, renta_neta, impuesto)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(usuario_id, anio, tipo, ingreso_bruto, gastos_deducibles, renta_neta, impuesto).run()
    }

    return Response.json({
      ok: true,
      mensaje: `Calculo de Renta ${anio} generado`,
      ingreso_bruto, gastos_deducibles, renta_neta, impuesto,
      meses_incluidos: cierres.results.length
    })

  } catch (error) {
    return Response.json({ error: "Error al calcular renta" }, { status: 500 })
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const { declaracion_id, estado } = await request.json()

    if (!declaracion_id || !estado) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const fecha_declarado = estado === "declarado" ? new Date().toISOString().substring(0, 10) : null

    await env.fiscalcr_db.prepare(`
      UPDATE declaraciones_renta SET estado = ?, fecha_declarado = ? WHERE id = ?
    `).bind(estado, fecha_declarado, declaracion_id).run()

    return Response.json({ ok: true, mensaje: "Estado actualizado" })

  } catch (error) {
    return Response.json({ error: "Error al actualizar estado" }, { status: 500 })
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const { declaracion_id } = await request.json()

    if (!declaracion_id) {
      return Response.json({ error: "declaracion_id requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(`
      DELETE FROM declaraciones_renta WHERE id = ?
    `).bind(declaracion_id).run()

    return Response.json({ ok: true, mensaje: "Declaracion eliminada" })

  } catch (error) {
    return Response.json({ error: "Error al eliminar declaracion" }, { status: 500 })
  }
}
