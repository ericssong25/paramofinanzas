/*
  # Soporte de frecuencia quincenal en clientes y pagos
*/

ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_frecuencia_check;

ALTER TABLE clientes
  ADD CONSTRAINT clientes_frecuencia_check
  CHECK (frecuencia IN ('unico', 'mensual', 'quincenal'));

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS quincena_numero smallint;

ALTER TABLE pagos
  DROP CONSTRAINT IF EXISTS pagos_quincena_numero_check;

ALTER TABLE pagos
  ADD CONSTRAINT pagos_quincena_numero_check
  CHECK (quincena_numero IS NULL OR quincena_numero IN (1, 2));

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_periodo_quincena
  ON pagos(cliente_id, periodo_referencia, quincena_numero);

COMMENT ON COLUMN pagos.quincena_numero IS '1 o 2 para clientes quincenales; null para mensual/unico';
