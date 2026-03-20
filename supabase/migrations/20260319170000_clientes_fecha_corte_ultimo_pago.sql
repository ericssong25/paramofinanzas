/*
  # Clientes: Renombrar proxima_fecha_pago a fecha_corte y agregar ultimo_pago
  
  - fecha_corte: fecha en que el cliente debe pagar (día de corte)
  - ultimo_pago: fecha del último pago recibido (para calcular meses adeudados/atrasados)
  
  Se puede RENOMBRAR la columna existente sin perder datos.
*/

-- Renombrar columna (conserva todos los datos)
ALTER TABLE clientes RENAME COLUMN proxima_fecha_pago TO fecha_corte;

-- Agregar nueva columna
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_pago date;

-- Actualizar índice
DROP INDEX IF EXISTS idx_clientes_proxima_fecha_pago;
CREATE INDEX IF NOT EXISTS idx_clientes_fecha_corte ON clientes(fecha_corte);

-- Sincronizar ultimo_pago desde pagos existentes (el pago más reciente por cliente)
UPDATE clientes c
SET ultimo_pago = (
  SELECT MAX(p.fecha)::date
  FROM pagos p
  WHERE p.cliente_id = c.id
)
WHERE EXISTS (SELECT 1 FROM pagos p WHERE p.cliente_id = c.id);

COMMENT ON COLUMN clientes.fecha_corte IS 'Fecha de corte: día en que el cliente debe pagar';
COMMENT ON COLUMN clientes.ultimo_pago IS 'Fecha del último pago recibido (para calcular meses adeudados)';
