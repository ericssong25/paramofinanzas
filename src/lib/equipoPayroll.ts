import { Equipo, Wallet } from '../types';

/** Encuentra la wallet de efectivo en USD (para liquidez de nómina). */
export function findUsdEfectivoWallet(wallets: Wallet[]): Wallet | undefined {
  const n = (s: string) => s.toLowerCase().trim();
  const exact = ['usd efectivo', 'efectivo usd', 'efectivo en usd', 'dólar efectivo', 'dolar efectivo'];
  const byExact = wallets.find(
    (w) => w.currency === 'USD' && exact.includes(n(w.name))
  );
  if (byExact) return byExact;
  return wallets.find((w) => w.currency === 'USD' && n(w.name).includes('efectivo'));
}

export interface MiembroQuincenaRow {
  id: string;
  nombre: string;
  rol: string;
  salario_mensual: number;
  quincena_bruta: number;
  adelanto_pendiente: number;
  a_pagar_proxima_quincena: number;
}

export function computeEquipoQuincenaRows(equipo: Equipo[]): MiembroQuincenaRow[] {
  return equipo.map((m) => {
    const salario = m.salario_mensual ?? 0;
    const quincena = salario / 2;
    const adelanto = m.adelanto_pendiente ?? 0;
    const aPagar = Math.max(0, quincena - adelanto);
    return {
      id: m.id,
      nombre: m.nombre,
      rol: m.rol,
      salario_mensual: salario,
      quincena_bruta: quincena,
      adelanto_pendiente: adelanto,
      a_pagar_proxima_quincena: aPagar,
    };
  });
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
