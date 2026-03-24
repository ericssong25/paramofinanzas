import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus, Trash2 } from 'lucide-react';
import { Gasto, Wallet } from '../types';
import { formatDateLocal } from '../lib/dateUtils';

export default function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    categoria: '',
    monto: '',
    moneda: 'USD',
    wallet_id: '',
    nota: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [gastosRes, walletsRes] = await Promise.all([
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('wallets').select('*'),
      ]);

      if (gastosRes.data) setGastos(gastosRes.data);
      if (walletsRes.data) setWallets(walletsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const gastoData = {
        ...formData,
        monto: parseFloat(formData.monto),
        fecha: new Date(formData.fecha).toISOString(),
      };

      const { data: insertedGasto, error: insertErr } = await supabase
        .from('gastos')
        .insert(gastoData)
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      const wallet = wallets.find((w) => w.id === formData.wallet_id);
      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance - parseFloat(formData.monto) })
          .eq('id', formData.wallet_id);
      }

      await supabase.from('movimientos').insert({
        tipo: 'gasto',
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        origen_wallet_id: formData.wallet_id,
        categoria: formData.categoria,
        nota: formData.nota,
        fecha: new Date(formData.fecha).toISOString(),
        gasto_id: insertedGasto?.id,
      });

      setShowModal(false);
      setFormData({
        categoria: '',
        monto: '',
        moneda: 'USD',
        wallet_id: '',
        nota: '',
        fecha: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Error creating gasto:', error);
    }
  }

  async function deleteGasto(gasto: Gasto) {
    if (!confirm('¿Eliminar este gasto? Se revertirá el saldo de la wallet y el movimiento asociado.')) return;
    try {
      const wallet = wallets.find((w) => w.id === gasto.wallet_id);
      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance + gasto.monto })
          .eq('id', gasto.wallet_id);
      }
      await supabase.from('gastos').delete().eq('id', gasto.id);
      loadData();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
    }
  }

  const categorias = [
    { value: 'Oficina', label: 'Oficina' },
    { value: 'Software', label: 'Software' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Operacional', label: 'Operacional' },
    { value: 'Otro', label: 'Otro' },
  ];

  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value: string) => formatDateLocal(value),
    },
    { header: 'Categoría', accessor: 'categoria' },
    {
      header: 'Monto',
      accessor: 'monto',
      render: (value: number, row: Gasto) =>
        `${row.moneda} $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      header: 'Nota',
      accessor: 'nota',
      render: (value: string) => value || '-',
    },
    {
      header: '',
      accessor: 'id',
      render: (_: unknown, row: Gasto) => (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            void deleteGasto(row);
          }}
          aria-label="Eliminar gasto"
        >
          <Trash2 size={14} />
        </Button>
      ),
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
          <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 mt-1">Registra los gastos operativos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <div className="flex items-center gap-2">
            <Plus size={20} />
            Nuevo Gasto
          </div>
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={gastos} />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Gasto">
        <form onSubmit={handleSubmit}>
          <Select
            label="Categoría"
            value={formData.categoria}
            onChange={(value) => setFormData({ ...formData, categoria: value })}
            options={categorias}
            required
          />

          <Input
            label="Monto"
            type="number"
            value={formData.monto}
            onChange={(value) => setFormData({ ...formData, monto: value })}
            required
          />

          <Select
            label="Moneda"
            value={formData.moneda}
            onChange={(value) => setFormData({ ...formData, moneda: value })}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'COP', label: 'COP' },
              { value: 'VES', label: 'VES' },
            ]}
            required
          />

          <Select
            label="Wallet Origen"
            value={formData.wallet_id}
            onChange={(value) => setFormData({ ...formData, wallet_id: value })}
            options={wallets.map((w) => ({ value: w.id, label: `${w.name} (${w.currency})` }))}
            required
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
            placeholder="Descripción del gasto"
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit">Registrar Gasto</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
