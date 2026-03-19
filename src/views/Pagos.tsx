import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus, Upload } from 'lucide-react';
import { Pago, Cliente, Wallet } from '../types';

interface PagoWithCliente extends Pago {
  cliente?: Cliente;
}

export default function Pagos() {
  const [pagos, setPagos] = useState<PagoWithCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    monto: '',
    metodo: '',
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
      const [pagosRes, clientesRes, walletsRes] = await Promise.all([
        supabase.from('pagos').select('*, clientes(*)').order('fecha', { ascending: false }),
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('wallets').select('*'),
      ]);

      if (pagosRes.data) {
        const pagosWithCliente = pagosRes.data.map((pago: any) => ({
          ...pago,
          cliente: Array.isArray(pago.clientes) ? pago.clientes[0] : pago.clientes,
        }));
        setPagos(pagosWithCliente);
      }
      if (clientesRes.data) setClientes(clientesRes.data);
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
      const pagoData = {
        ...formData,
        monto: parseFloat(formData.monto),
        fecha: new Date(formData.fecha).toISOString(),
      };

      await supabase.from('pagos').insert(pagoData);

      const wallet = wallets.find((w) => w.id === formData.wallet_id);
      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance + parseFloat(formData.monto) })
          .eq('id', formData.wallet_id);
      }

      setShowModal(false);
      setFormData({
        cliente_id: '',
        monto: '',
        metodo: '',
        moneda: 'USD',
        wallet_id: '',
        nota: '',
        fecha: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Error creating pago:', error);
    }
  }

  const metodosPago = [
    { value: 'Zelle', label: 'Zelle' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'USDT', label: 'USDT' },
    { value: 'Zinli', label: 'Zinli' },
    { value: 'Transferencia', label: 'Transferencia' },
  ];

  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES'),
    },
    {
      header: 'Cliente',
      accessor: 'cliente',
      render: (_: any, row: PagoWithCliente) => row.cliente?.nombre || '-',
    },
    {
      header: 'Monto',
      accessor: 'monto',
      render: (value: number, row: Pago) =>
        `${row.moneda} $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    { header: 'Método', accessor: 'metodo' },
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
          <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 mt-1">Registra los pagos recibidos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <div className="flex items-center gap-2">
            <Plus size={20} />
            Nuevo Pago
          </div>
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={pagos} />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Pago">
        <form onSubmit={handleSubmit}>
          <Select
            label="Cliente"
            value={formData.cliente_id}
            onChange={(value) => setFormData({ ...formData, cliente_id: value })}
            options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
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
            label="Método de Pago"
            value={formData.metodo}
            onChange={(value) => setFormData({ ...formData, metodo: value })}
            options={metodosPago}
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
            label="Wallet Destino"
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
            placeholder="Opcional"
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comprobante</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <div className="text-sm text-gray-600">Click para subir imagen</div>
              <div className="text-xs text-gray-400 mt-1">PNG, JPG hasta 5MB</div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit">Registrar Pago</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
