import { SupabaseClient } from '@supabase/supabase-js';
import { Movimiento, Wallet } from '../types';

/** Revierte saldos de wallets según el movimiento (antes de borrar la fila). */
export async function reverseMovimientoWallet(
  supabase: SupabaseClient,
  mov: Movimiento,
  wallets: Wallet[]
): Promise<void> {
  const comision = mov.comision || 0;
  const monto = mov.monto;

  if (mov.tipo === 'ingreso' && mov.destino_wallet_id) {
    const llega = monto - comision;
    const w = wallets.find((x) => x.id === mov.destino_wallet_id);
    if (w) {
      await supabase
        .from('wallets')
        .update({ balance: w.balance - llega })
        .eq('id', mov.destino_wallet_id);
    }
    return;
  }

  if (mov.tipo === 'conversion' && mov.origen_wallet_id && mov.destino_wallet_id) {
    const llega = monto - comision;
    const o = wallets.find((x) => x.id === mov.origen_wallet_id);
    const d = wallets.find((x) => x.id === mov.destino_wallet_id);
    if (o) {
      await supabase.from('wallets').update({ balance: o.balance + monto }).eq('id', mov.origen_wallet_id);
    }
    if (d) {
      await supabase.from('wallets').update({ balance: d.balance - llega }).eq('id', mov.destino_wallet_id);
    }
    return;
  }

  if (mov.tipo === 'gasto' && mov.origen_wallet_id) {
    const w = wallets.find((x) => x.id === mov.origen_wallet_id);
    if (w) {
      await supabase.from('wallets').update({ balance: w.balance + monto }).eq('id', mov.origen_wallet_id);
    }
    return;
  }

  if (mov.tipo === 'pago_equipo' && mov.origen_wallet_id) {
    const w = wallets.find((x) => x.id === mov.origen_wallet_id);
    if (w) {
      await supabase.from('wallets').update({ balance: w.balance + monto }).eq('id', mov.origen_wallet_id);
    }
  }
}

/** Elimina un movimiento y revierte wallets, gasto vinculado o adelantos de equipo. */
export async function deleteMovimientoCompleto(
  supabase: SupabaseClient,
  mov: Movimiento,
  wallets: Wallet[]
): Promise<void> {
  await reverseMovimientoWallet(supabase, mov, wallets);

  if (mov.tipo === 'gasto' && mov.gasto_id) {
    await supabase.from('gastos').delete().eq('id', mov.gasto_id);
    return;
  }

  if (mov.tipo === 'pago_equipo' && mov.equipo_id) {
    const { data: eq } = await supabase.from('equipo').select('*').eq('id', mov.equipo_id).single();
    if (eq) {
      const quincena = (eq.salario_mensual || 0) / 2;
      const cur = eq.adelanto_pendiente || 0;
      if (mov.tipo_pago_equipo === 'adelanto') {
        await supabase
          .from('equipo')
          .update({ adelanto_pendiente: Math.max(0, cur - mov.monto) })
          .eq('id', mov.equipo_id);
      } else {
        await supabase
          .from('equipo')
          .update({ adelanto_pendiente: cur + quincena })
          .eq('id', mov.equipo_id);
      }
    }
    await supabase.from('movimientos').delete().eq('id', mov.id);
    return;
  }

  await supabase.from('movimientos').delete().eq('id', mov.id);
}
