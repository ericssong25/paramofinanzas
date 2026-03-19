import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus } from 'lucide-react';
import { Cliente } from '../types';

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    servicio: '',
    monto_esperado: '',
    moneda: 'USD',
    frecuencia: 'mensual',
    proxima_fecha_pago: '',
    estado: 'activo',
  });

  useEffect(() => {
    loadClientes();
  }, []);

  async function loadClientes() {
    try {
      const { data } = await supabase.from('clientes').select('*').order('nombre');
      if (data) setClientes(data);
    } catch (error) {
      console.error('Error loading clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await supabase.from('clientes').insert({
        ...formData,
        monto_esperado: parseFloat(formData.monto_esperado),
      });
      setShowModal(false);
      setFormData({
        nombre: '',
        servicio: '',
        monto_esperado: '',
        moneda: 'USD',
        frecuencia: 'mensual',
        proxima_fecha_pago: '',
        estado: 'activo',
      });
      loadClientes();
    } catch (error) {
      console.error('Error creating cliente:', error);
    }
  }

  const columns = [
    { header: 'Cliente', accessor: 'nombre' },
    { header: 'Servicio', accessor: 'servicio' },
    {
      header: 'Monto Esperado',
      accessor: 'monto_esperado',
      render: (value: number, row: Cliente) =>
        `${row.moneda} $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    { header: 'Frecuencia', accessor: 'frecuencia' },
    {
      header: 'Próximo Pago',
      accessor: 'proxima_fecha_pago',
      render: (value: string) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'activo'
              ? 'bg-green-100 text-green-700'
              : value === 'atrasado'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {value}
        </span>
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
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestiona tus clientes y sus pagos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <div className="flex items-center gap-2">
            <Plus size={20} />
            Nuevo Cliente
          </div>
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={clientes} />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Cliente">
        <form onSubmit={handleSubmit}>
          <Input
            label="Nombre del Cliente"
            value={formData.nombre}
            onChange={(value) => setFormData({ ...formData, nombre: value })}
            required
          />

          <Input
            label="Servicio"
            value={formData.servicio}
            onChange={(value) => setFormData({ ...formData, servicio: value })}
            required
          />

          <Input
            label="Monto Esperado"
            type="number"
            value={formData.monto_esperado}
            onChange={(value) => setFormData({ ...formData, monto_esperado: value })}
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
            label="Frecuencia"
            value={formData.frecuencia}
            onChange={(value) => setFormData({ ...formData, frecuencia: value })}
            options={[
              { value: 'unico', label: 'Único' },
              { value: 'mensual', label: 'Mensual' },
            ]}
            required
          />

          <Input
            label="Próxima Fecha de Pago"
            type="date"
            value={formData.proxima_fecha_pago}
            onChange={(value) => setFormData({ ...formData, proxima_fecha_pago: value })}
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit">Crear Cliente</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
