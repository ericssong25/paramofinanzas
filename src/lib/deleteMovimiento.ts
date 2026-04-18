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
    const { data: w } = await supabase.from('wallets').select('balance').eq('id', mov.origen_wallet_id).single();
    if (w) {
      await supabase
        .from('wallets')
        .update({ balance: Number(w.balance) + monto })
        .eq('id', mov.origen_wallet_id);
    }
  }
}

/** Elimina un movimiento y revierte wallets, gasto vinculado o adelantos de equipo. */
export async function deleteMovimientoCompleto(
  supabase: SupabaseClient,
  mov: Movimiento,
  wallets: Wallet[]
): Promise<void> {
  if (mov.tipo === 'pago_equipo' && mov.equipo_id) {
    const grupoId = mov.equipo_pago_grupo_id;
    const { data: grupoRows } = grupoId
      ? await supabase
          .from('movimientos')
          .select('*')
          .eq('equipo_pago_grupo_id', grupoId)
          .eq('tipo', 'pago_equipo')
      : { data: [mov] };

    const rows = grupoRows && grupoRows.length > 0 ? grupoRows : [mov];

    for (const r of rows) {
      await reverseMovimientoWallet(supabase, r, wallets);
    }

    const { data: eq } = await supabase.from('equipo').select('*').eq('id', mov.equipo_id).single();
    if (eq) {
      const quincena = (eq.salario_mensual || 0) / 2;
      const cur = eq.adelanto_pendiente || 0;
      const tipoPago = rows[0]?.tipo_pago_equipo;
      const totalUsd = rows.reduce((sum, r) => {
        if (r.equipo_pago_equiv_usd != null && Number.isFinite(Number(r.equipo_pago_equiv_usd))) {
          return sum + Number(r.equipo_pago_equiv_usd);
        }
        if (r.moneda === 'USD') return sum + Number(r.monto || 0);
        return sum;
      }, 0);

      if (tipoPago === 'adelanto') {
        await supabase
          .from('equipo')
          .update({ adelanto_pendiente: Math.max(0, cur - totalUsd) })
          .eq('id', mov.equipo_id);
      } else {
        await supabase
          .from('equipo')
          .update({ adelanto_pendiente: cur + quincena })
          .eq('id', mov.equipo_id);
      }
    }

    const ids = rows.map((r) => r.id);
    await supabase.from('movimientos').delete().in('id', ids);
    return;
  }

  await reverseMovimientoWallet(supabase, mov, wallets);

  if (mov.tipo === 'gasto' && mov.gasto_id) {
    await supabase.from('gastos').delete().eq('id', mov.gasto_id);
    return;
  }

  await supabase.from('movimientos').delete().eq('id', mov.id);
}
