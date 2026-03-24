-- Vincular movimientos de tipo gasto al registro en gastos (para eliminar en cascada lógica)
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS gasto_id uuid REFERENCES gastos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_movimientos_gasto_id ON movimientos(gasto_id);

COMMENT ON COLUMN movimientos.gasto_id IS 'Si el movimiento viene de la sección Gastos, referencia al gasto';
