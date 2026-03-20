import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus } from 'lucide-react';
import { Movimiento, Wallet } from '../types';
import { formatDateLocal } from '../lib/dateUtils';

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'ingreso' as 'ingreso' | 'conversion',
    monto: '',
    origen_wallet_id: '',
    destino_wallet_id: '',
    comision: '',
    moneda: 'USD',
    fecha: new Date().toISOString().split('T')[0],
    nota: '',
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      let query = supabase
        .from('movimientos')
        .select('*, equipo(nombre)')
        .order('fecha', { ascending: false });
      if (filter !== 'all') query = query.eq('tipo', filter);

      const [movRes, walletsRes] = await Promise.all([
        query,
        supabase.from('wallets').select('*').order('name'),
      ]);

      if (movRes.data) setMovimientos(movRes.data);
      if (walletsRes.data) setWallets(walletsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const monto = parseFloat(formData.monto);
    const comision = formData.comision ? parseFloat(formData.comision) : 0;

    if (formData.tipo === 'conversion' && !formData.origen_wallet_id) {
      return;
    }
    if (!formData.destino_wallet_id) return;

    try {
      await supabase.from('movimientos').insert({
        tipo: formData.tipo,
        monto,
        moneda: formData.moneda,
        origen_wallet_id: formData.tipo === 'conversion' ? formData.origen_wallet_id : null,
        destino_wallet_id: formData.destino_wallet_id,
        comision,
        fecha: new Date(formData.fecha + 'T12:00:00').toISOString(),
        nota: formData.nota || null,
      });

      if (formData.tipo === 'ingreso') {
        const destino = wallets.find((w) => w.id === formData.destino_wallet_id);
        const llegaADestino = monto - comision;
        if (destino) {
          await supabase
            .from('wallets')
            .update({ balance: destino.balance + llegaADestino })
            .eq('id', formData.destino_wallet_id);
        }
      } else {
        const origen = wallets.find((w) => w.id === formData.origen_wallet_id);
        const destino = wallets.find((w) => w.id === formData.destino_wallet_id);
        const llegaADestino = monto - comision;

        if (origen) {
          await supabase
            .from('wallets')
            .update({ balance: origen.balance - monto })
            .eq('id', formData.origen_wallet_id);
        }
        if (destino) {
          await supabase
            .from('wallets')
            .update({ balance: destino.balance + llegaADestino })
            .eq('id', formData.destino_wallet_id);
        }
      }

      setShowModal(false);
      setFormData({
        tipo: 'ingreso',
        monto: '',
        origen_wallet_id: '',
        destino_wallet_id: '',
        comision: '',
        moneda: 'USD',
        fecha: new Date().toISOString().split('T')[0],
        nota: '',
      });
      loadData();
    } catch (error) {
      console.error('Error al crear movimiento:', error);
    }
  }

  function getWalletName(id: string | null | undefined): string {
    if (!id) return '-';
    const w = wallets.find((x) => x.id === id);
    return w ? w.name : '-';
  }

  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value: string) => formatDateLocal(value),
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (value: string, row: Movimiento) => {
        const tipoLabel =
          value === 'pago_equipo' && row.tipo_pago_equipo
            ? row.tipo_pago_equipo === 'adelanto'
              ? 'Adelanto'
              : row.tipo_pago_equipo === 'quincena_con_descuento'
              ? 'Quincena (descuento)'
              : 'Pago quincena'
            : value.replace('_', ' ');
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              value === 'ingreso'
                ? 'bg-green-100 text-green-700'
                : value === 'gasto'
                ? 'bg-red-100 text-red-700'
                : value === 'conversion'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {tipoLabel}
          </span>
        );
      },
    },
    {
      header: 'Wallet Origen',
      accessor: 'origen_wallet_id',
      render: (value: string) => getWalletName(value),
    },
    {
      header: 'Wallet Destino',
      accessor: 'destino_wallet_id',
      render: (value: string) => getWalletName(value),
    },
    {
      header: 'Miembro',
      accessor: 'miembro_nombre',
      render: (value: string, row: Movimiento & { equipo?: { nombre: string } }) =>
        value || row.equipo?.nombre ? (
          <span className="font-medium">{value || row.equipo?.nombre}</span>
        ) : (
          '-'
        ),
    },
    {
      header: 'Monto',
      accessor: 'monto',
      render: (value: number, row: Movimiento) =>
        `${row.moneda} $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      header: 'Comisión',
      accessor: 'comision',
      render: (value: number) =>
        value > 0 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      header: 'Nota',
      accessor: 'nota',
      render: (value: string) => value || '-',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-gray-500 mt-1">Historial de transacciones financieras</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <div className="flex items-center gap-2">
            <Plus size={20} />
            Nuevo Movimiento
          </div>
        </Button>
      </div>

      <div className="flex gap-2">
        {['all', 'ingreso', 'conversion', 'gasto', 'pago_equipo'].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFilter(tipo)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tipo ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tipo === 'all' ? 'Todos' : tipo.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Card>
        <Table columns={columns} data={movimientos} />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo Movimiento (Ingreso o Conversión)"
      >
        <form onSubmit={handleSubmit}>
          <Select
            label="Tipo"
            value={formData.tipo}
            onChange={(value) =>
              setFormData({
                ...formData,
                tipo: value as 'ingreso' | 'conversion',
                origen_wallet_id: value === 'ingreso' ? '' : formData.origen_wallet_id,
              })
            }
            options={[
              { value: 'ingreso', label: 'Ingreso' },
              { value: 'conversion', label: 'Conversión' },
            ]}
          />

          <Input
            label="Monto"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.monto}
            onChange={(value) => setFormData({ ...formData, monto: value })}
            required
          />

          {formData.tipo === 'conversion' && (
            <Select
              label="Wallet Origen"
              value={formData.origen_wallet_id}
              onChange={(value) => setFormData({ ...formData, origen_wallet_id: value })}
              options={wallets.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.currency} $${w.balance.toFixed(2)})`,
              }))}
              required
            />
          )}

          <Select
            label="Wallet Destino"
            value={formData.destino_wallet_id}
            onChange={(value) => setFormData({ ...formData, destino_wallet_id: value })}
            options={wallets.map((w) => ({
              value: w.id,
              label: `${w.name} (${w.currency} $${w.balance.toFixed(2)})`,
            }))}
            required
          />

          <Input
            label="Comisión (opcional, monto que te quitaron)"
            type="number"
            step="0.01"
            min="0"
            value={formData.comision}
            onChange={(value) => setFormData({ ...formData, comision: value })}
            placeholder="Ej: 5"
          />

          <Input
            label="Fecha"
            type="date"
            value={formData.fecha}
            onChange={(value) => setFormData({ ...formData, fecha: value })}
            required
          />

          <Input
            label="Nota"
            value={formData.nota}
            onChange={(value) => setFormData({ ...formData, nota: value })}
            placeholder="Opcional"
          />

          {formData.comision && parseFloat(formData.comision) > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              Llegará a destino: $
              {(parseFloat(formData.monto || '0') - parseFloat(formData.comision || '0')).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}{' '}
              (monto − comisión)
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button type="submit">Registrar Movimiento</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
