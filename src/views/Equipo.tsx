import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus, DollarSign, History, Pencil, Trash2 } from 'lucide-react';
import { Equipo as EquipoType, Wallet, Movimiento } from '../types';
import { formatDateLocal } from '../lib/dateUtils';
import { deleteMovimientoCompleto } from '../lib/deleteMovimiento';

export default function Equipo() {
  const [equipo, setEquipo] = useState<EquipoType[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<EquipoType | null>(null);
  const [memberPayments, setMemberPayments] = useState<Movimiento[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    rol: '',
    salario_mensual: '',
  });
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    rol: '',
    salario_mensual: '',
  });
  const [paymentData, setPaymentData] = useState({
    tipoPago: 'adelanto' as 'adelanto' | 'quincena',
    monto: '',
    wallet_id: '',
    nota: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [equipoRes, walletsRes] = await Promise.all([
        supabase.from('equipo').select('*').order('nombre'),
        supabase.from('wallets').select('*'),
      ]);

      if (equipoRes.data) setEquipo(equipoRes.data);
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
      await supabase.from('equipo').insert({
        ...formData,
        salario_mensual: formData.salario_mensual ? parseFloat(formData.salario_mensual) : 0,
      });
      setShowModal(false);
      setFormData({ nombre: '', rol: '', salario_mensual: '' });
      loadData();
    } catch (error) {
      console.error('Error creating equipo:', error);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      await supabase
        .from('equipo')
        .update({
          nombre: editFormData.nombre,
          rol: editFormData.rol,
          salario_mensual: editFormData.salario_mensual ? parseFloat(editFormData.salario_mensual) : 0,
        })
        .eq('id', selectedMember.id);
      setShowEditModal(false);
      setSelectedMember(null);
      loadData();
    } catch (error) {
      console.error('Error updating equipo:', error);
    }
  }

  async function loadMemberPayments(memberId: string) {
    const { data } = await supabase
      .from('movimientos')
      .select('*')
      .eq('equipo_id', memberId)
      .eq('tipo', 'pago_equipo')
      .order('fecha', { ascending: false });
    setMemberPayments(data || []);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) return;

    const salarioMensual = selectedMember.salario_mensual || 0;
    const salarioQuincenal = salarioMensual / 2;
    const adelantoPendiente = selectedMember.adelanto_pendiente || 0;

    let montoAPagar: number;
    let tipoPagoEquipo: 'quincena_completa' | 'adelanto' | 'quincena_con_descuento';

    if (paymentData.tipoPago === 'adelanto') {
      montoAPagar = parseFloat(paymentData.monto);
      tipoPagoEquipo = 'adelanto';
      if (montoAPagar <= 0) return;
    } else {
      // Pago quincena: deducir adelantos
      montoAPagar = Math.max(0, salarioQuincenal - adelantoPendiente);
      tipoPagoEquipo = adelantoPendiente > 0 ? 'quincena_con_descuento' : 'quincena_completa';
    }

    try {
      await supabase.from('movimientos').insert({
        tipo: 'pago_equipo',
        tipo_pago_equipo: tipoPagoEquipo,
        monto: montoAPagar,
        moneda: 'USD',
        origen_wallet_id: paymentData.wallet_id,
        equipo_id: selectedMember.id,
        miembro_nombre: selectedMember.nombre,
        nota: paymentData.nota || (paymentData.tipoPago === 'adelanto' ? 'Adelanto' : 'Pago quincena'),
      });

      const wallet = wallets.find((w) => w.id === paymentData.wallet_id);
      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance - montoAPagar })
          .eq('id', paymentData.wallet_id);
      }

      if (paymentData.tipoPago === 'adelanto') {
        await supabase
          .from('equipo')
          .update({ adelanto_pendiente: adelantoPendiente + montoAPagar })
          .eq('id', selectedMember.id);
      } else {
        const nuevoAdelanto = Math.max(0, adelantoPendiente - salarioQuincenal);
        await supabase.from('equipo').update({ adelanto_pendiente: nuevoAdelanto }).eq('id', selectedMember.id);
      }

      setShowPaymentModal(false);
      setPaymentData({ tipoPago: 'adelanto', monto: '', wallet_id: '', nota: '' });
      setSelectedMember(null);
      loadData();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  }

  function openEditModal(member: EquipoType) {
    setSelectedMember(member);
    setEditFormData({
      nombre: member.nombre,
      rol: member.rol,
      salario_mensual: member.salario_mensual?.toString() || '',
    });
    setShowEditModal(true);
  }

  function openPaymentModal(member: EquipoType) {
    setSelectedMember(member);
    const salarioQuincenal = (member.salario_mensual || 0) / 2;
    const adelantoPendiente = member.adelanto_pendiente || 0;
    const montoQuincena = Math.max(0, salarioQuincenal - adelantoPendiente);
    setPaymentData({
      tipoPago: 'adelanto',
      monto: '',
      wallet_id: wallets[0]?.id || '',
      nota: '',
    });
    setShowPaymentModal(true);
  }

  function openHistoryModal(member: EquipoType) {
    setSelectedMember(member);
    loadMemberPayments(member.id);
    setShowHistoryModal(true);
  }

  async function deleteHistorialPago(p: Movimiento) {
    if (!selectedMember) return;
    if (!confirm('¿Eliminar este pago al equipo? Se revertirá la wallet y los adelantos/quincenas asociados.')) return;
    try {
      await deleteMovimientoCompleto(supabase, p, wallets);
      await loadMemberPayments(selectedMember.id);
      await loadData();
    } catch (error) {
      console.error('Error al eliminar pago de equipo:', error);
    }
  }

  const columns = [
    { header: 'Nombre', accessor: 'nombre' },
    { header: 'Rol', accessor: 'rol' },
    {
      header: 'Salario Mensual',
      accessor: 'salario_mensual',
      render: (value: number) =>
        value != null && value > 0 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      header: 'Salario Quincenal',
      accessor: 'salario_mensual',
      render: (value: number) => {
        const quincenal = (value || 0) / 2;
        return quincenal > 0 ? `$${quincenal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      header: 'Adelanto Pendiente',
      accessor: 'adelanto_pendiente',
      render: (value: number) =>
        value != null && value > 0 ? (
          <span className="text-amber-600 font-medium">
            ${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'Acciones',
      accessor: 'id',
      render: (_: unknown, row: EquipoType) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openHistoryModal(row)}>
            <History size={14} />
          </Button>
          <Button size="sm" onClick={() => openPaymentModal(row)}>
            <div className="flex items-center gap-1">
              <DollarSign size={16} />
              Pagar
            </div>
          </Button>
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-500 mt-1">Gestiona los miembros de tu equipo, salarios y pagos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <div className="flex items-center gap-2">
            <Plus size={20} />
            Nuevo Miembro
          </div>
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={equipo} />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Miembro">
        <form onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            value={formData.nombre}
            onChange={(value) => setFormData({ ...formData, nombre: value })}
            required
          />
          <Input
            label="Rol"
            value={formData.rol}
            onChange={(value) => setFormData({ ...formData, rol: value })}
            required
          />
          <Input
            label="Salario Mensual (USD)"
            type="number"
            step="0.01"
            min="0"
            value={formData.salario_mensual}
            onChange={(value) => setFormData({ ...formData, salario_mensual: value })}
            placeholder="0.00"
          />
          <div className="flex gap-3 mt-6">
            <Button type="submit">Crear Miembro</Button>
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
          setSelectedMember(null);
        }}
        title={`Editar ${selectedMember?.nombre}`}
      >
        <form onSubmit={handleEditSubmit}>
          <Input
            label="Nombre"
            value={editFormData.nombre}
            onChange={(value) => setEditFormData({ ...editFormData, nombre: value })}
            required
          />
          <Input
            label="Rol"
            value={editFormData.rol}
            onChange={(value) => setEditFormData({ ...editFormData, rol: value })}
            required
          />
          <Input
            label="Salario Mensual (USD)"
            type="number"
            step="0.01"
            min="0"
            value={editFormData.salario_mensual}
            onChange={(value) => setEditFormData({ ...editFormData, salario_mensual: value })}
            placeholder="0.00"
          />
          <div className="flex gap-3 mt-6">
            <Button type="submit">Guardar</Button>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedMember(null);
        }}
        title={`Pagar a ${selectedMember?.nombre}`}
      >
        <form onSubmit={handlePayment}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pago</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoPago"
                  checked={paymentData.tipoPago === 'adelanto'}
                  onChange={() => setPaymentData({ ...paymentData, tipoPago: 'adelanto', monto: '' })}
                />
                Adelanto
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoPago"
                  checked={paymentData.tipoPago === 'quincena'}
                  onChange={() => {
                    const salarioQuincenal = (selectedMember?.salario_mensual || 0) / 2;
                    const adelantoPendiente = selectedMember?.adelanto_pendiente || 0;
                    const monto = Math.max(0, salarioQuincenal - adelantoPendiente);
                    setPaymentData({ ...paymentData, tipoPago: 'quincena', monto: monto.toString() });
                  }}
                />
                Pago quincena
              </label>
            </div>
          </div>

          {paymentData.tipoPago === 'quincena' && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>Monto a pagar:</strong> $
              {Math.max(
                0,
                (selectedMember?.salario_mensual || 0) / 2 - (selectedMember?.adelanto_pendiente || 0)
              ).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              (quincena − adelantos pendientes)
            </div>
          )}

          {paymentData.tipoPago === 'adelanto' && (
            <Input
              label="Monto del adelanto"
              type="number"
              step="0.01"
              min="0.01"
              value={paymentData.monto}
              onChange={(value) => setPaymentData({ ...paymentData, monto: value })}
              required={paymentData.tipoPago === 'adelanto'}
            />
          )}

          <Select
            label="Wallet Origen"
            value={paymentData.wallet_id}
            onChange={(value) => setPaymentData({ ...paymentData, wallet_id: value })}
            options={wallets.map((w) => ({ value: w.id, label: `${w.name} ($${w.balance.toFixed(2)})` }))}
            required
          />

          <Input
            label="Nota"
            value={paymentData.nota}
            onChange={(value) => setPaymentData({ ...paymentData, nota: value })}
            placeholder={paymentData.tipoPago === 'adelanto' ? 'Adelanto' : 'Pago quincena'}
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit">Procesar Pago</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedMember(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedMember(null);
        }}
        title={`Historial de pagos - ${selectedMember?.nombre}`}
      >
        <div className="max-h-80 overflow-y-auto">
          {memberPayments.length === 0 ? (
            <p className="text-gray-500 py-4">No hay pagos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-right py-2">Monto</th>
                  <th className="text-left py-2">Nota</th>
                  <th className="w-10 py-2" />
                </tr>
              </thead>
              <tbody>
                {memberPayments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2">{formatDateLocal(p.fecha)}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          p.tipo_pago_equipo === 'adelanto'
                            ? 'bg-amber-100 text-amber-800'
                            : p.tipo_pago_equipo === 'quincena_con_descuento'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {p.tipo_pago_equipo === 'adelanto'
                          ? 'Adelanto'
                          : p.tipo_pago_equipo === 'quincena_con_descuento'
                          ? 'Quincena (con descuento)'
                          : 'Quincena completa'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">${p.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-gray-600">{p.nota || '-'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => deleteHistorialPago(p)}
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
}
