import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus, Pencil } from 'lucide-react';
import { Cliente } from '../types';
import {
  parseDateLocal,
  formatDateLocal,
  formatDiaDeCadaMes,
  formatDiasCorteQuincenal,
  getNextCorteTimestamp,
} from '../lib/dateUtils';

function mesesAdeudados(cliente: Cliente): number | null {
  const ultimo = parseDateLocal(cliente.ultimo_pago);
  if (!ultimo) return null;
  const corte = parseDateLocal(cliente.fecha_corte);
  const hoy = new Date();
  const diaCorte = corte ? corte.getDate() : ultimo.getDate();

  let siguiente = new Date(ultimo.getTime());
  siguiente.setMonth(siguiente.getMonth() + 1);
  siguiente.setDate(diaCorte);

  let meses = 0;
  while (siguiente <= hoy) {
    meses++;
    siguiente.setMonth(siguiente.getMonth() + 1);
  }
  return meses;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [sortConfig, setSortConfig] = useState<{ by: string; order: 'asc' | 'desc' } | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    servicio: '',
    monto_esperado: '',
    moneda: 'USD',
    frecuencia: 'mensual',
    periodicidad_pago: 'mensual',
    fecha_corte: '',
    ultimo_pago: '',
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
        fecha_corte: formData.fecha_corte || null,
        ultimo_pago: formData.ultimo_pago || null,
      });
      setShowModal(false);
      resetForm();
      loadClientes();
    } catch (error) {
      console.error('Error creating cliente:', error);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCliente) return;
    try {
      await supabase
        .from('clientes')
        .update({
          ...formData,
          monto_esperado: parseFloat(formData.monto_esperado),
          fecha_corte: formData.fecha_corte || null,
          ultimo_pago: formData.ultimo_pago || null,
        })
        .eq('id', editingCliente.id);
      setShowEditModal(false);
      setEditingCliente(null);
      resetForm();
      loadClientes();
    } catch (error) {
      console.error('Error updating cliente:', error);
    }
  }

  function resetForm() {
    setFormData({
      nombre: '',
      servicio: '',
      monto_esperado: '',
      moneda: 'USD',
      frecuencia: 'mensual',
      periodicidad_pago: 'mensual',
      fecha_corte: '',
      ultimo_pago: '',
      estado: 'activo',
    });
  }

  function handleSort(accessor: string, newOrder?: 'asc' | 'desc') {
    setSortConfig((prev) => {
      const order =
        newOrder ?? (prev?.by === accessor ? (prev.order === 'asc' ? 'desc' : 'asc') : 'asc');
      return { by: accessor, order };
    });
  }

  const hoyOrden = new Date();
  const clientesOrdenados = [...clientes].sort((a, b) => {
    if (!sortConfig) return 0;
    const { by: sortBy, order: sortOrder } = sortConfig;
    const mult = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'monto_esperado') {
      return mult * (a.monto_esperado - b.monto_esperado);
    }
    if (sortBy === 'fecha_corte') {
      const ta = getNextCorteTimestamp(a.fecha_corte, hoyOrden);
      const tb = getNextCorteTimestamp(b.fecha_corte, hoyOrden);
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      const cmp = ta - tb;
      return mult * cmp;
    }
    if (sortBy === 'ultimo_pago') {
      const da = parseDateLocal(a.ultimo_pago)?.getTime() ?? 0;
      const db = parseDateLocal(b.ultimo_pago)?.getTime() ?? 0;
      return mult * (da - db);
    }
    return 0;
  });

  function openEditModal(cliente: Cliente) {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      servicio: cliente.servicio,
      monto_esperado: cliente.monto_esperado.toString(),
      moneda: cliente.moneda,
      frecuencia: cliente.frecuencia,
      periodicidad_pago: cliente.periodicidad_pago || 'mensual',
      fecha_corte: cliente.fecha_corte ? cliente.fecha_corte.split('T')[0] : '',
      ultimo_pago: cliente.ultimo_pago ? cliente.ultimo_pago.split('T')[0] : '',
      estado: cliente.estado,
    });
    setShowEditModal(true);
  }

  const columns = [
    { header: 'Cliente', accessor: 'nombre' },
    { header: 'Servicio', accessor: 'servicio' },
    {
      header: 'Monto Esperado',
      accessor: 'monto_esperado',
      sortable: true,
      render: (value: number, row: Cliente) =>
        `${row.moneda} $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    { header: 'Frecuencia', accessor: 'frecuencia' },
    {
      header: 'Pago',
      accessor: 'periodicidad_pago',
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'quincenal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {value === 'quincenal' ? 'Quincenal' : 'Mensual'}
        </span>
      ),
    },
    {
      header: 'Fecha Corte',
      accessor: 'fecha_corte',
      sortable: true,
      render: (value: string, row: Cliente) =>
        row.frecuencia === 'quincenal' ? formatDiasCorteQuincenal(value) : formatDiaDeCadaMes(value),
    },
    {
      header: 'Último Pago',
      accessor: 'ultimo_pago',
      sortable: true,
      render: (value: string) => formatDateLocal(value),
    },
    {
      header: 'Meses',
      accessor: 'id',
      render: (_: unknown, row: Cliente) => {
        const meses = mesesAdeudados(row);
        if (meses === null) return '-';
        if (meses === 0) return <span className="text-green-600">0</span>;
        return <span className="font-medium text-amber-600">{meses}</span>;
      },
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
    {
      header: 'Acciones',
      accessor: 'id',
      render: (_: unknown, row: Cliente) => (
        <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
          <Pencil size={14} />
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
        <Table
          columns={columns}
          data={clientesOrdenados}
          sortBy={sortConfig?.by}
          sortOrder={sortConfig?.order ?? 'asc'}
          onSort={handleSort}
        />
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
              { value: 'quincenal', label: 'Quincenal' },
            ]}
            required
          />

          <Select
            label="Periodicidad de pago (control)"
            value={formData.periodicidad_pago}
            onChange={(value) => setFormData({ ...formData, periodicidad_pago: value })}
            options={[
              { value: 'mensual', label: 'Mensual (paga completo)' },
              { value: 'quincenal', label: 'Quincenal (paga en 2 partes)' },
            ]}
            required
          />

          <Input
            label="Fecha Corte (día que debe pagar)"
            type="date"
            value={formData.fecha_corte}
            onChange={(value) => setFormData({ ...formData, fecha_corte: value })}
            placeholder="Opcional"
          />
          {formData.frecuencia === 'quincenal' && formData.fecha_corte && (
            <div className="mb-4 -mt-2 text-xs text-blue-700">
              Cortes estimados: {formatDiasCorteQuincenal(formData.fecha_corte)}
            </div>
          )}

          <Input
            label="Último Pago"
            type="date"
            value={formData.ultimo_pago}
            onChange={(value) => setFormData({ ...formData, ultimo_pago: value })}
            placeholder="Fecha del último pago recibido"
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit">Crear Cliente</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCliente(null);
        }}
        title={`Editar ${editingCliente?.nombre}`}
      >
        <form onSubmit={handleEditSubmit}>
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
              { value: 'quincenal', label: 'Quincenal' },
            ]}
            required
          />

          <Select
            label="Periodicidad de pago (control)"
            value={formData.periodicidad_pago}
            onChange={(value) => setFormData({ ...formData, periodicidad_pago: value })}
            options={[
              { value: 'mensual', label: 'Mensual (paga completo)' },
              { value: 'quincenal', label: 'Quincenal (paga en 2 partes)' },
            ]}
            required
          />

          <Input
            label="Fecha Corte (día que debe pagar)"
            type="date"
            value={formData.fecha_corte}
            onChange={(value) => setFormData({ ...formData, fecha_corte: value })}
          />
          {formData.frecuencia === 'quincenal' && formData.fecha_corte && (
            <div className="mb-4 -mt-2 text-xs text-blue-700">
              Cortes estimados: {formatDiasCorteQuincenal(formData.fecha_corte)}
            </div>
          )}

          <Input
            label="Último Pago"
            type="date"
            value={formData.ultimo_pago}
            onChange={(value) => setFormData({ ...formData, ultimo_pago: value })}
          />

          <Select
            label="Estado"
            value={formData.estado}
            onChange={(value) => setFormData({ ...formData, estado: value })}
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'atrasado', label: 'Atrasado' },
              { value: 'inactivo', label: 'Inactivo' },
            ]}
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit">Guardar</Button>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
