import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import {
  Wallet as WalletIcon,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Users,
  Banknote,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Wallet, Cliente, Equipo } from '../types';
import { formatProximoDiaLabel, getNextCorteTimestamp } from '../lib/dateUtils';
import {
  findUsdEfectivoWallet,
  computeEquipoQuincenaRows,
  formatUsd,
} from '../lib/equipoPayroll';

export default function Dashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipo, setEquipo] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [walletsRes, clientesRes, equipoRes] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('equipo').select('*').order('nombre'),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);
      if (equipoRes.data) setEquipo(equipoRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalBalance = wallets.reduce((sum, w) => {
    if (w.currency === 'USD' || w.currency === 'USDT') {
      return sum + w.balance;
    }
    return sum;
  }, 0);

  const clientesAtrasados = clientes.filter((c) => c.estado === 'atrasado');
  const hoy = new Date();
  const clientesProximoPago = clientes
    .filter((c) => c.estado === 'activo')
    .sort((a, b) => {
      const ta = getNextCorteTimestamp(a.fecha_corte, hoy);
      const tb = getNextCorteTimestamp(b.fecha_corte, hoy);
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return ta - tb;
    })
    .slice(0, 5);

  const dineroEsperado = clientes
    .filter((c) => c.estado === 'activo' && c.frecuencia === 'mensual')
    .reduce((sum, c) => sum + c.monto_esperado, 0);

  const dineroPendiente = clientesAtrasados.reduce((sum, c) => sum + c.monto_esperado, 0);

  const filasQuincena = computeEquipoQuincenaRows(equipo);
  const totalSalariosMensuales = filasQuincena.reduce((s, r) => s + r.salario_mensual, 0);
  const totalQuincenalBruto = filasQuincena.reduce((s, r) => s + r.quincena_bruta, 0);
  const totalAdelantosPendientes = filasQuincena.reduce((s, r) => s + r.adelanto_pendiente, 0);
  const totalProximaQuincena = filasQuincena.reduce((s, r) => s + r.a_pagar_proxima_quincena, 0);
  const walletEfectivoUsd = findUsdEfectivoWallet(wallets);
  const saldoEfectivoUsd = walletEfectivoUsd?.balance ?? 0;
  const faltaParaQuincena = Math.max(0, totalProximaQuincena - saldoEfectivoUsd);
  const miembrosConSalario = filasQuincena.filter((r) => r.salario_mensual > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen financiero de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Balance Total"
          value={`$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign size={20} />}
          subtitle="USD + USDT"
        />

        <StatCard
          title="Ingresos Esperados"
          value={`$${dineroEsperado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp size={20} />}
          subtitle="Este mes"
        />

        <StatCard
          title="Dinero Pendiente"
          value={`$${dineroPendiente.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<AlertCircle size={20} />}
          subtitle={`${clientesAtrasados.length} clientes atrasados`}
        />

        <StatCard
          title="Clientes Activos"
          value={clientes.filter((c) => c.estado === 'activo').length.toString()}
          icon={<TrendingUp size={20} />}
          subtitle={`${clientes.length} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Wallets">
          <div className="space-y-4">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <WalletIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{wallet.name}</div>
                    <div className="text-sm text-gray-500">{wallet.currency}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {wallet.currency === 'COP' || wallet.currency === 'VES'
                      ? wallet.balance.toLocaleString()
                      : `$${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Próximos Pagos">
          <div className="space-y-3">
            {clientesProximoPago.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay pagos próximos</div>
            ) : (
              clientesProximoPago.map((cliente) => (
                <div key={cliente.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{cliente.nombre}</div>
                    <div className="text-sm text-gray-500">{cliente.servicio}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ${cliente.monto_esperado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatProximoDiaLabel(cliente.fecha_corte)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card title="Nómina del equipo (próxima quincena)">
        <div className="space-y-6">
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            <Info size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Alcance del cálculo</p>
              <p className="mt-1 text-amber-800/90">
                La comparación con efectivo disponible usa <strong>solo</strong> la wallet de{' '}
                <strong>USD en efectivo</strong>
                {walletEfectivoUsd ? (
                  <>
                    {' '}
                    (<span className="font-mono">{walletEfectivoUsd.name}</span>
                    ). No incluye Zelle, USDT ni otras divisas ni tasas de cambio.
                  </>
                ) : (
                  <>
                    . <span className="text-red-700">No se detectó una wallet con &quot;efectivo&quot; en USD</span>
                    — revisa el nombre en Wallets.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suma salarios mensuales</div>
              <div className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{formatUsd(totalSalariosMensuales)}</div>
              <div className="text-xs text-gray-500 mt-1">{equipo.length} miembro(s) en equipo</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total quincenal (bruto)</div>
              <div className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{formatUsd(totalQuincenalBruto)}</div>
              <div className="text-xs text-gray-500 mt-1">50% del mensual, sumado</div>
            </div>
            <div className="p-4 rounded-xl border border-violet-200 bg-violet-50">
              <div className="text-xs font-medium text-violet-700 uppercase tracking-wide">Adelantos pendientes</div>
              <div className="mt-1 text-xl font-bold text-violet-900 tabular-nums">{formatUsd(totalAdelantosPendientes)}</div>
              <div className="text-xs text-violet-700/80 mt-1">Se descuentan de la próx. quincena</div>
            </div>
            <div className="p-4 rounded-xl border-2 border-blue-300 bg-blue-50">
              <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1">
                <Users size={14} /> Próxima quincena a pagar
              </div>
              <div className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{formatUsd(totalProximaQuincena)}</div>
              <div className="text-xs text-blue-800/90 mt-1">Suma neto por persona (quincena − adelanto)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border-2 border-emerald-200 bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <Banknote size={20} />
                Liquidez en USD efectivo
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-900">{formatUsd(saldoEfectivoUsd)}</p>
              <p className="text-sm text-emerald-800/90 mt-1">
                {walletEfectivoUsd
                  ? `Saldo actual en «${walletEfectivoUsd.name}»`
                  : 'Sin wallet de efectivo USD identificada'}
              </p>
            </div>
            <div
              className={`p-5 rounded-xl border-2 ${
                faltaParaQuincena > 0
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-green-300 bg-green-50'
              }`}
            >
              <div
                className={`font-semibold flex items-center gap-2 ${
                  faltaParaQuincena > 0 ? 'text-orange-900' : 'text-green-900'
                }`}
              >
                {faltaParaQuincena > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                {faltaParaQuincena > 0 ? 'Todavía necesitas' : 'Cobertura próxima quincena'}
              </div>
              {faltaParaQuincena > 0 ? (
                <>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-orange-900">{formatUsd(faltaParaQuincena)}</p>
                  <p className="text-sm text-orange-800/90 mt-2">
                    Faltante en efectivo USD para cubrir la próxima quincena ({formatUsd(totalProximaQuincena)} necesarios
                    − {formatUsd(saldoEfectivoUsd)} disponibles).
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-semibold text-green-900">
                    Efectivo suficiente para la próxima quincena
                  </p>
                  <p className="text-sm text-green-800/90 mt-2">
                    {totalProximaQuincena === 0
                      ? 'No hay montos de quincena configurados o todos están en cero.'
                      : `Te sobran aprox. ${formatUsd(saldoEfectivoUsd - totalProximaQuincena)} en esa wallet tras pagar.`}
                  </p>
                </>
              )}
            </div>
          </div>

          {miembrosConSalario.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Desglose por miembro</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-left">
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Miembro</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Rol</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700 text-right">Salario / mes</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700 text-right">Quincena (50%)</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700 text-right">Adelanto pend.</th>
                      <th className="py-2.5 px-3 font-semibold text-blue-800 text-right">A pagar próx. quincena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miembrosConSalario.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 font-medium text-gray-900">{r.nombre}</td>
                        <td className="py-2.5 px-3 text-gray-600">{r.rol}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatUsd(r.salario_mensual)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{formatUsd(r.quincena_bruta)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-violet-700">
                          {r.adelanto_pendiente > 0 ? formatUsd(r.adelanto_pendiente) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-blue-900">
                          {formatUsd(r.a_pagar_proxima_quincena)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                      <td colSpan={2} className="py-2.5 px-3 text-gray-800">
                        Totales
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatUsd(totalSalariosMensuales)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatUsd(totalQuincenalBruto)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-violet-800">
                        {formatUsd(totalAdelantosPendientes)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-blue-900">{formatUsd(totalProximaQuincena)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Fórmula por persona: máximo(0, quincena bruta − adelanto pendiente), igual que al registrar un pago
                quincena en Equipo.
              </p>
            </div>
          )}

          {equipo.length > 0 && miembrosConSalario.length === 0 && (
            <p className="text-sm text-gray-500">
              Aún no hay salarios mensuales configurados en Equipo. Edita cada miembro y asigna salario mensual para ver
              el desglose.
            </p>
          )}
        </div>
      </Card>

      {clientesAtrasados.length > 0 && (
        <Card title="Clientes Atrasados">
          <div className="space-y-3">
            {clientesAtrasados.map((cliente) => (
              <div
                key={cliente.id}
                className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{cliente.nombre}</div>
                  <div className="text-sm text-gray-500">{cliente.servicio}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">
                    ${cliente.monto_esperado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500">Vencido</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
