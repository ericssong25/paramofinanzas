/*
  # Pagos a equipo en varias divisas (una fila por wallet / moneda)

  - equipo_pago_grupo_id: mismo UUID en todas las líneas de un mismo pago.
  - equipo_pago_equiv_usd: equivalente en USD de esa línea (para adelantos y resumen).
  - equipo_pago_tasa: unidades de moneda local por 1 USD (ej. COP por USD); null en líneas USD.
*/

ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS equipo_pago_grupo_id uuid,
  ADD COLUMN IF NOT EXISTS equipo_pago_equiv_usd decimal(15,2),
  ADD COLUMN IF NOT EXISTS equipo_pago_tasa decimal(15,4);

CREATE INDEX IF NOT EXISTS idx_movimientos_equipo_pago_grupo
  ON movimientos(equipo_pago_grupo_id)
  WHERE equipo_pago_grupo_id IS NOT NULL;

COMMENT ON COLUMN movimientos.equipo_pago_grupo_id IS 'Agrupa varias filas pago_equipo del mismo pago (multimoneda)';
COMMENT ON COLUMN movimientos.equipo_pago_equiv_usd IS 'Equivalente en USD de la línea (nativo / tasa si no es USD)';
COMMENT ON COLUMN movimientos.equipo_pago_tasa IS 'Moneda local por 1 USD en el momento del pago; null si la línea es USD';
