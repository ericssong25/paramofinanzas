import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import { Wallet as WalletIcon, TrendingUp, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';
import { Wallet, Cliente } from '../types';

export default function Dashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [walletsRes, clientesRes] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('clientes').select('*'),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);
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
  const clientesProximoPago = clientes
    .filter((c) => c.estado === 'activo')
    .sort((a, b) => new Date(a.proxima_fecha_pago).getTime() - new Date(b.proxima_fecha_pago).getTime())
    .slice(0, 5);

  const dineroEsperado = clientes
    .filter((c) => c.estado === 'activo' && c.frecuencia === 'mensual')
    .reduce((sum, c) => sum + c.monto_esperado, 0);

  const dineroPendiente = clientesAtrasados.reduce((sum, c) => sum + c.monto_esperado, 0);

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
                      {new Date(cliente.proxima_fecha_pago).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

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
