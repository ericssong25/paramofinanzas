export interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  servicio: string;
  monto_esperado: number;
  moneda: string;
  frecuencia: 'unico' | 'mensual' | 'quincenal';
  periodicidad_pago?: 'mensual' | 'quincenal';
  fecha_corte: string;
  ultimo_pago?: string;
  estado: 'activo' | 'atrasado' | 'inactivo';
  created_at: string;
  updated_at: string;
}

export interface Pago {
  id: string;
  cliente_id: string;
  fecha: string;
  monto: number;
  periodo_referencia?: string;
  quincena_numero?: 1 | 2 | null;
  tipo_registro?: 'abono' | 'completado';
  metodo: string;
  moneda: string;
  comprobante_url?: string;
  nota?: string;
  wallet_id: string;
  created_at: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  rol: string;
  salario_mensual?: number;
  adelanto_pendiente?: number;
  created_at: string;
}

export interface Gasto {
  id: string;
  categoria: string;
  monto: number;
  moneda: string;
  fecha: string;
  wallet_id: string;
  nota?: string;
  created_at: string;
}

export type TipoPagoEquipo = 'quincena_completa' | 'adelanto' | 'quincena_con_descuento';

export interface Movimiento {
  id: string;
  tipo: 'ingreso' | 'conversion' | 'gasto' | 'pago_equipo';
  fecha: string;
  monto: number;
  moneda: string;
  origen_wallet_id?: string;
  destino_wallet_id?: string;
  comision: number;
  gasto_id?: string;
  pago_id?: string;
  equipo_id?: string;
  miembro_nombre?: string;
  tipo_pago_equipo?: TipoPagoEquipo;
  categoria?: string;
  nota?: string;
  created_at: string;
}
