/*
  # Clientes: periodicidad de pago (mensual/quincenal)

  Nota: es independiente de `frecuencia` (unico/mensual) que define si el cliente es recurrente.
  Esto sirve para control operativo: cómo suele pagar un plan mensual.
*/

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS periodicidad_pago text NOT NULL DEFAULT 'mensual';

ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_periodicidad_pago_check;

ALTER TABLE clientes
  ADD CONSTRAINT clientes_periodicidad_pago_check
  CHECK (periodicidad_pago IN ('mensual', 'quincenal'));

CREATE INDEX IF NOT EXISTS idx_clientes_periodicidad_pago
  ON clientes(periodicidad_pago);

COMMENT ON COLUMN clientes.periodicidad_pago IS 'Cómo suele pagar el cliente: mensual o quincenal';
