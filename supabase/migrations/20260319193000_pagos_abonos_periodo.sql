/*
  # Pagos parciales por periodo mensual

  Permite registrar abonos de un mismo mes para un cliente y
  detectar en la app cuando el total abonado completa la mensualidad.
*/

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS periodo_referencia date,
  ADD COLUMN IF NOT EXISTS tipo_registro text NOT NULL DEFAULT 'abono';

UPDATE pagos
SET periodo_referencia = DATE_TRUNC('month', fecha)::date
WHERE periodo_referencia IS NULL;

ALTER TABLE pagos
  ALTER COLUMN periodo_referencia SET NOT NULL;

ALTER TABLE pagos
  DROP CONSTRAINT IF EXISTS pagos_tipo_registro_check;

ALTER TABLE pagos
  ADD CONSTRAINT pagos_tipo_registro_check
  CHECK (tipo_registro IN ('abono', 'completado'));

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_periodo
  ON pagos(cliente_id, periodo_referencia);

COMMENT ON COLUMN pagos.periodo_referencia IS 'Mes aplicado del pago (primer dia del mes)';
COMMENT ON COLUMN pagos.tipo_registro IS 'abono o completado segun saldo del periodo al registrar';
