-- MIGRACION: Modulo de Renta Anual
-- Ejecutar estos comandos con wrangler antes de desplegar el codigo nuevo.

-- 1. Agregar columnas de monto neto (sin IVA) a la tabla de cierres mensuales.
--    Estas se necesitan para calcular ingreso bruto y gastos deducibles de Renta.
ALTER TABLE cierres_mes ADD COLUMN neto_ventas REAL DEFAULT 0;
ALTER TABLE cierres_mes ADD COLUMN neto_compras REAL DEFAULT 0;

-- 2. Crear tabla para las declaraciones anuales de Renta
CREATE TABLE IF NOT EXISTS declaraciones_renta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  anio TEXT NOT NULL,
  tipo_contribuyente TEXT NOT NULL DEFAULT 'fisica',
  ingreso_bruto REAL DEFAULT 0,
  gastos_deducibles REAL DEFAULT 0,
  renta_neta REAL DEFAULT 0,
  impuesto REAL DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  fecha_declarado TEXT,
  UNIQUE(usuario_id, anio)
);
