import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import { Wallet as WalletIcon } from 'lucide-react';
import { Wallet } from '../types';

export default function Wallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallets();
  }, []);

  async function loadWallets() {
    try {
      const { data } = await supabase.from('wallets').select('*').order('name');
      if (data) setWallets(data);
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoading(false);
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Wallets</h1>
        <p className="text-gray-500 mt-1">Gestiona tus cuentas y saldos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => {
          const colors = [
            { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
            { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
            { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600' },
            { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600' },
            { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600' },
            { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'text-cyan-600' },
          ];
          const colorIndex = wallets.indexOf(wallet) % colors.length;
          const color = colors[colorIndex];

          return (
            <Card key={wallet.id} className={`${color.bg} ${color.border} border-2`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${color.bg} rounded-full flex items-center justify-center`}>
                    <WalletIcon size={24} className={color.icon} />
                  </div>
                  <div className="text-sm font-medium text-gray-600">{wallet.currency}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">{wallet.name}</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {wallet.currency === 'COP' || wallet.currency === 'VES'
                      ? wallet.balance.toLocaleString()
                      : `$${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
