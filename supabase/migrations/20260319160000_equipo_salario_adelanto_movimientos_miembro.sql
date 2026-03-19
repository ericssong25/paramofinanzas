/*
  # Equipo: salario mensual, adelantos y historial
  # Movimientos: columna miembro (opcional)
  
  ## Cambios en equipo
  - salario_mensual: salario mensual del miembro
  - adelanto_pendiente: total de adelantos no descontados (se deduce de la próxima quincena)
  
  ## Cambios en movimientos
  - miembro_nombre: nombre del miembro (para pagos de equipo, historial)
  - tipo_pago_equipo: 'quincena_completa' | 'adelanto' | 'quincena_con_descuento'
*/

-- Equipo: agregar salario mensual y adelanto pendiente
ALTER TABLE equipo
  ADD COLUMN IF NOT EXISTS salario_mensual decimal(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adelanto_pendiente decimal(15,2) DEFAULT 0;

-- Movimientos: agregar miembro y tipo de pago
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS miembro_nombre text,
  ADD COLUMN IF NOT EXISTS tipo_pago_equipo text;

-- Comentarios para documentación
COMMENT ON COLUMN equipo.salario_mensual IS 'Salario mensual del miembro. Quincenal = salario_mensual / 2';
COMMENT ON COLUMN equipo.adelanto_pendiente IS 'Total de adelantos no descontados. Se deduce de la próxima quincena';
COMMENT ON COLUMN movimientos.miembro_nombre IS 'Nombre del miembro (para pago_equipo). Opcional';
COMMENT ON COLUMN movimientos.tipo_pago_equipo IS 'Para tipo=pago_equipo: quincena_completa | adelanto | quincena_con_descuento';
