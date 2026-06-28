export async function onRequestPost({ request, env }) {
  try {
    const { usuario_id, cliente, lineas, notas } = await request.json()

    if (!usuario_id || !lineas || lineas.length === 0) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Calcular totales
    let subtotal = 0
    let totalIVA = 0
    for (const linea of lineas) {
      const sub = linea.cantidad * linea.precio_unitario
      const iva = sub * (linea.porcentaje_iva / 100)
      subtotal += sub
      totalIVA += iva
    }
    const total = subtotal + totalIVA

    // Generar número consecutivo
    const count = await env.fiscalcr_db.prepare(
      "SELECT COUNT(*) as total FROM facturas_electronicas WHERE usuario_id = ?"
    ).bind(usuario_id).first().catch(() => ({ total: 0 }))

    const consecutivo = String((count?.total || 0) + 1).padStart(10, "0")
    const fechaEmision = new Date().toISOString()
    const cedula = env.CEDULA_EMISOR

    // Generar clave numérica (50 dígitos según Hacienda)
    const fecha = new Date()
    const dia = String(fecha.getDate()).padStart(2, "0")
    const mes = String(fecha.getMonth() + 1).padStart(2, "0")
    const anio = String(fecha.getFullYear()).slice(-2)
    const random = String(Math.floor(Math.random() * 99999999)).padStart(8, "0")
    const clave = `506${dia}${mes}${anio}${cedula.padStart(12, "0")}${consecutivo}1${random}1`

    // Generar XML de factura electrónica v4.4
    const xmlLineas = lineas.map((l, i) => {
      const sub = l.cantidad * l.precio_unitario
      const iva = sub * (l.porcentaje_iva / 100)
      return `
        <LineaDetalle>
          <NumeroLinea>${i + 1}</NumeroLinea>
          <Cantidad>${l.cantidad}</Cantidad>
          <UnidadMedida>${l.unidad || "Sp"}</UnidadMedida>
          <Detalle>${l.descripcion}</Detalle>
          <PrecioUnitario>${l.precio_unitario.toFixed(2)}</PrecioUnitario>
          <MontoTotal>${sub.toFixed(2)}</MontoTotal>
          <Impuesto>
            <Codigo>01</Codigo>
            <CodigoTarifa>0${l.porcentaje_iva === 13 ? "8" : l.porcentaje_iva === 4 ? "4" : l.porcentaje_iva === 2 ? "3" : "2"}</CodigoTarifa>
            <Tarifa>${l.porcentaje_iva}</Tarifa>
            <Monto>${iva.toFixed(2)}</Monto>
          </Impuesto>
          <MontoTotalLinea>${(sub + iva).toFixed(2)}</MontoTotalLinea>
        </LineaDetalle>`
    }).join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Clave>${clave}</Clave>
  <CodigoActividad>620900</CodigoActividad>
  <NumeroConsecutivo>00100001010${consecutivo}</NumeroConsecutivo>
  <FechaEmision>${fechaEmision}</FechaEmision>
  <Emisor>
    <Nombre>${env.NOMBRE_EMISOR || "FiscalCR"}</Nombre>
    <Identificacion>
      <Tipo>01</Tipo>
      <Numero>${cedula}</Numero>
    </Identificacion>
    <CorreoElectronico>${env.CORREO_EMISOR || ""}</CorreoElectronico>
  </Emisor>
  <Receptor>
    <Nombre>${cliente?.nombre || "Cliente General"}</Nombre>
    ${cliente?.cedula ? `<Identificacion><Tipo>01</Tipo><Numero>${cliente.cedula}</Numero></Identificacion>` : ""}
    ${cliente?.correo ? `<CorreoElectronico>${cliente.correo}</CorreoElectronico>` : ""}
  </Receptor>
  <CondicionVenta>01</CondicionVenta>
  <MedioPago>01</MedioPago>
  <DetalleServicio>${xmlLineas}
  </DetalleServicio>
  <ResumenFactura>
    <CodigoTipoMoneda><CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio></CodigoTipoMoneda>
    <TotalServGravados>${subtotal.toFixed(2)}</TotalServGravados>
    <TotalServExentos>0.00</TotalServExentos>
    <TotalServExonerado>0.00</TotalServExonerado>
    <TotalMercanciasGravadas>0.00</TotalMercanciasGravadas>
    <TotalMercanciasExentas>0.00</TotalMercanciasExentas>
    <TotalMercExonerada>0.00</TotalMercExonerada>
    <TotalGravado>${subtotal.toFixed(2)}</TotalGravado>
    <TotalExento>0.00</TotalExento>
    <TotalExonerado>0.00</TotalExonerado>
    <TotalVenta>${subtotal.toFixed(2)}</TotalVenta>
    <TotalDescuentos>0.00</TotalDescuentos>
    <TotalVentaNeta>${subtotal.toFixed(2)}</TotalVentaNeta>
    <TotalImpuesto>${totalIVA.toFixed(2)}</TotalImpuesto>
    <TotalComprobante>${total.toFixed(2)}</TotalComprobante>
  </ResumenFactura>
  ${notas ? `<Otros><OtroTexto>${notas}</OtroTexto></Otros>` : ""}
</FacturaElectronica>`

    // Guardar en base de datos
    await env.fiscalcr_db.prepare(`
      CREATE TABLE IF NOT EXISTS facturas_electronicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        clave TEXT NOT NULL,
        consecutivo TEXT NOT NULL,
        fecha TEXT NOT NULL,
        cliente_nombre TEXT,
        subtotal REAL,
        total_iva REAL,
        total REAL,
        xml TEXT,
        estado TEXT DEFAULT 'generada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    await env.fiscalcr_db.prepare(`
      INSERT INTO facturas_electronicas (usuario_id, clave, consecutivo, fecha, cliente_nombre, subtotal, total_iva, total, xml)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(usuario_id, clave, consecutivo, fechaEmision, cliente?.nombre || "", subtotal, totalIVA, total, xml).run()

    return Response.json({ ok: true, clave, consecutivo, xml, subtotal, totalIVA, total })

  } catch (error) {
    return Response.json({ error: "Error al generar factura: " + error.message }, { status: 500 })
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const usuario_id = url.searchParams.get("usuario_id")

    if (!usuario_id) {
      return Response.json({ error: "usuario_id requerido" }, { status: 400 })
    }

    await env.fiscalcr_db.prepare(`
      CREATE TABLE IF NOT EXISTS facturas_electronicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        clave TEXT NOT NULL,
        consecutivo TEXT NOT NULL,
        fecha TEXT NOT NULL,
        cliente_nombre TEXT,
        subtotal REAL,
        total_iva REAL,
        total REAL,
        xml TEXT,
        estado TEXT DEFAULT 'generada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    const facturas = await env.fiscalcr_db.prepare(`
      SELECT id, clave, consecutivo, fecha, cliente_nombre, subtotal, total_iva, total, estado, created_at
      FROM facturas_electronicas WHERE usuario_id = ? ORDER BY created_at DESC
    `).bind(usuario_id).all()

    return Response.json({ ok: true, facturas: facturas.results })

  } catch (error) {
    return Response.json({ error: "Error al obtener facturas" }, { status: 500 })
  }
}