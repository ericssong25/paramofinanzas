import { useEffect, useMemo, useState } from 'react';
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

/** Texto automático de pico / objetivo quincena (si existe en la nota guardada). */
function extractAjusteSistemaFromNota(nota: string | null | undefined): string | null {
  if (!nota?.trim()) return null;
  const parts = nota.split(' | ');
  const hit = parts.find(
    (p) =>
      p.startsWith('Objetivo quincena') ||
      p.includes('sobrante (picos') ||
      p.includes('faltante vs objetivo')
  );
  return hit?.trim() ?? null;
}

/** Comentario libre del usuario (primera parte de la nota, excluyendo textos por defecto). */
function extractUsuarioComentarioFromNota(nota: string | null | undefined): string {
  if (!nota?.trim()) return '';
  const base = nota.split(' | ')[0]?.trim() ?? '';
  if (!base || base === 'Pago quincena' || base === 'Adelanto') return '';
  return base;
}

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
    nota: '',
  });
  const [paymentLegs, setPaymentLegs] = useState([{ wallet_id: '', monto: '', tasa: '' }]);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  type LegResolved = {
    wallet: Wallet;
    montoNativo: number;
    equivUsd: number;
    tasa: number | null;
  };

  function resolvePaymentLegs(): { ok: true; legs: LegResolved[] } | { ok: false; message: string } {
    const resolved: LegResolved[] = [];
    for (let i = 0; i < paymentLegs.length; i++) {
      const leg = paymentLegs[i];
      const wallet = wallets.find((w) => w.id === leg.wallet_id);
      if (!wallet) return { ok: false, message: `Línea ${i + 1}: selecciona una wallet válida.` };
      const montoNativo = parseFloat(leg.monto);
      if (!Number.isFinite(montoNativo) || montoNativo <= 0) {
        return { ok: false, message: `Línea ${i + 1}: indica un monto mayor a cero en la moneda de la wallet.` };
      }
      if (wallet.currency === 'USD') {
        resolved.push({ wallet, montoNativo, equivUsd: montoNativo, tasa: null });
      } else {
        const tasa = parseFloat(leg.tasa);
        if (!Number.isFinite(tasa) || tasa <= 0) {
          return {
            ok: false,
            message: `Línea ${i + 1}: indica la tasa (${wallet.currency} por 1 USD) para convertir a dólares.`,
          };
        }
        resolved.push({ wallet, montoNativo, equivUsd: montoNativo / tasa, tasa });
      }
    }
    return { ok: true, legs: resolved };
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    if (!selectedMember) return;

    const salarioMensual = selectedMember.salario_mensual || 0;
    const salarioQuincenal = salarioMensual / 2;
    const adelantoPendiente = selectedMember.adelanto_pendiente || 0;

    let montoObjetivoUsd: number | null = null;
    let tipoPagoEquipo: 'quincena_completa' | 'adelanto' | 'quincena_con_descuento';

    if (paymentData.tipoPago === 'adelanto') {
      tipoPagoEquipo = 'adelanto';
    } else {
      montoObjetivoUsd = Math.max(0, salarioQuincenal - adelantoPendiente);
      tipoPagoEquipo = adelantoPendiente > 0 ? 'quincena_con_descuento' : 'quincena_completa';
    }

    const resolved = resolvePaymentLegs();
    if (!resolved.ok) {
      setPaymentError(resolved.message);
      return;
    }

    const totalUsd = resolved.legs.reduce((s, l) => s + l.equivUsd, 0);
    if (totalUsd <= 0) {
      setPaymentError('La suma en USD de las líneas debe ser mayor a cero.');
      return;
    }

    let ajusteObjetivoSuffix = '';
    if (paymentData.tipoPago === 'quincena' && montoObjetivoUsd != null) {
      const diff = totalUsd - montoObjetivoUsd;
      if (Math.abs(diff) > 0.005) {
        const obj = montoObjetivoUsd.toFixed(2);
        const sum = totalUsd.toFixed(2);
        ajusteObjetivoSuffix =
          diff > 0
            ? ` | Objetivo quincena ${obj} USD; suma pagada equiv. ${sum} USD; sobrante (picos/redondeo/tasas) +${diff.toFixed(2)} USD`
            : ` | Objetivo quincena ${obj} USD; suma pagada equiv. ${sum} USD; faltante vs objetivo ${diff.toFixed(2)} USD`;
      }
    }

    for (const leg of resolved.legs) {
      const w = wallets.find((x) => x.id === leg.wallet.id);
      if (w && w.balance < leg.montoNativo) {
        setPaymentError(`Saldo insuficiente en ${leg.wallet.name} (${leg.wallet.currency}).`);
        return;
      }
    }

    const grupoId = crypto.randomUUID();
    const fechaIso = new Date().toISOString();
    const baseNota =
      paymentData.nota.trim() || (paymentData.tipoPago === 'adelanto' ? 'Adelanto' : 'Pago quincena');

    const walletPrev: { id: string; balance: number }[] = [];
    const insertedMovIds: string[] = [];

    try {
      for (const leg of resolved.legs) {
        const { data: wRow, error: wFetchErr } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', leg.wallet.id)
          .single();
        if (wFetchErr || !wRow) throw new Error(wFetchErr?.message || 'No se pudo leer la wallet');
        const bal = Number(wRow.balance);
        if (bal < leg.montoNativo) throw new Error(`Saldo insuficiente en ${leg.wallet.name}`);
        walletPrev.push({ id: leg.wallet.id, balance: bal });
        const { error: wUpdErr } = await supabase
          .from('wallets')
          .update({ balance: bal - leg.montoNativo })
          .eq('id', leg.wallet.id);
        if (wUpdErr) throw new Error(wUpdErr.message);
      }

      for (const leg of resolved.legs) {
        const detalle =
          leg.wallet.currency === 'USD'
            ? `${leg.wallet.name}: ${leg.montoNativo.toFixed(2)} USD`
            : `${leg.wallet.name}: ${leg.montoNativo.toFixed(2)} ${leg.wallet.currency} @ ${leg.tasa!.toFixed(
                4
              )} / USD → ${leg.equivUsd.toFixed(2)} USD`;

        const { data: ins, error: insErr } = await supabase
          .from('movimientos')
          .insert({
            tipo: 'pago_equipo',
            tipo_pago_equipo: tipoPagoEquipo,
            monto: leg.montoNativo,
            moneda: leg.wallet.currency,
            origen_wallet_id: leg.wallet.id,
            equipo_id: selectedMember.id,
            miembro_nombre: selectedMember.nombre,
            fecha: fechaIso,
            comision: 0,
            equipo_pago_grupo_id: grupoId,
            equipo_pago_equiv_usd: leg.equivUsd,
            equipo_pago_tasa: leg.tasa,
            nota: `${baseNota} | ${detalle}${ajusteObjetivoSuffix}`,
          })
          .select('id')
          .single();

        if (insErr || !ins?.id) throw new Error(insErr?.message || 'Error al registrar movimiento');
        insertedMovIds.push(ins.id);
      }

      if (paymentData.tipoPago === 'adelanto') {
        await supabase
          .from('equipo')
          .update({ adelanto_pendiente: adelantoPendiente + totalUsd })
          .eq('id', selectedMember.id);
      } else {
        const nuevoAdelanto = Math.max(0, adelantoPendiente - salarioQuincenal);
        await supabase.from('equipo').update({ adelanto_pendiente: nuevoAdelanto }).eq('id', selectedMember.id);
      }

      setShowPaymentModal(false);
      setPaymentData({ tipoPago: 'adelanto', nota: '' });
      setPaymentLegs([{ wallet_id: '', monto: '', tasa: '' }]);
      setPaymentError(null);
      setSelectedMember(null);
      loadData();
    } catch (err: unknown) {
      if (insertedMovIds.length > 0) {
        await supabase.from('movimientos').delete().in('id', insertedMovIds);
      }
      for (const rb of walletPrev) {
        await supabase.from('wallets').update({ balance: rb.balance }).eq('id', rb.id);
      }
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago';
      setPaymentError(msg);
      console.error('Error processing payment:', err);
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
    const defaultWalletId = wallets.find((w) => w.currency === 'USD')?.id ?? wallets[0]?.id ?? '';
    setPaymentData({
      tipoPago: 'adelanto',
      nota: '',
    });
    setPaymentLegs([{ wallet_id: defaultWalletId, monto: '', tasa: '' }]);
    setPaymentError(null);
    setShowPaymentModal(true);
  }

  function openHistoryModal(member: EquipoType) {
    setSelectedMember(member);
    loadMemberPayments(member.id);
    setShowHistoryModal(true);
  }

  const pagosHistorialAgrupados = useMemo(() => {
    const map = new Map<string, Movimiento[]>();
    for (const m of memberPayments) {
      const k = m.equipo_pago_grupo_id || m.id;
      const arr = map.get(k) || [];
      arr.push(m);
      map.set(k, arr);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a[0]?.fecha || 0).getTime();
      const tb = new Date(b[0]?.fecha || 0).getTime();
      return tb - ta;
    });
  }, [memberPayments]);

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
          setPaymentError(null);
        }}
        title={`Pagar a ${selectedMember?.nombre}`}
      >
        <form onSubmit={handlePayment}>
          {paymentError && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
              {paymentError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pago</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoPago"
                  checked={paymentData.tipoPago === 'adelanto'}
                  onChange={() => {
                    const wid = wallets.find((w) => w.currency === 'USD')?.id ?? wallets[0]?.id ?? '';
                    setPaymentData({ ...paymentData, tipoPago: 'adelanto' });
                    setPaymentLegs([{ wallet_id: wid, monto: '', tasa: '' }]);
                  }}
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
                    const wid = wallets.find((w) => w.currency === 'USD')?.id ?? wallets[0]?.id ?? '';
                    setPaymentData({ ...paymentData, tipoPago: 'quincena' });
                    setPaymentLegs([{ wallet_id: wid, monto: monto.toFixed(2), tasa: '' }]);
                  }}
                />
                Pago quincena
              </label>
            </div>
          </div>

          {paymentData.tipoPago === 'quincena' && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>Total a pagar (USD):</strong> $
              {Math.max(
                0,
                (selectedMember?.salario_mensual || 0) / 2 - (selectedMember?.adelanto_pendiente || 0)
              ).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              (quincena − adelantos pendientes). Si por tasas o redondeo no cuadra al centavo, igual puedes
              registrar el pago: el sobrante o la diferencia queda anotado automáticamente en la nota de cada
              movimiento del grupo.
            </div>
          )}

          {paymentData.tipoPago === 'adelanto' && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-900">
              En adelanto, el total en USD lo defines sumando las líneas (puedes mezclar USD y otras monedas con
              tasa).
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Formas de pago</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const wid = wallets.find((w) => w.currency === 'USD')?.id ?? wallets[0]?.id ?? '';
                setPaymentLegs([...paymentLegs, { wallet_id: wid, monto: '', tasa: '' }]);
              }}
            >
              Añadir línea
            </Button>
          </div>

          {paymentLegs.map((leg, idx) => {
            const wSel = wallets.find((w) => w.id === leg.wallet_id);
            const esUsd = wSel?.currency === 'USD';
            const mNat = parseFloat(leg.monto || '0');
            const tasa = parseFloat(leg.tasa || '0');
            const equiv =
              wSel && Number.isFinite(mNat) && mNat > 0
                ? esUsd
                  ? mNat
                  : Number.isFinite(tasa) && tasa > 0
                  ? mNat / tasa
                  : null
                : null;
            return (
              <div key={idx} className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-600">Línea {idx + 1}</span>
                  {paymentLegs.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setPaymentLegs(paymentLegs.filter((_, j) => j !== idx))}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <Select
                  label="Wallet origen"
                  value={leg.wallet_id}
                  onChange={(value) => {
                    const next = [...paymentLegs];
                    next[idx] = { ...next[idx], wallet_id: value, tasa: '' };
                    setPaymentLegs(next);
                  }}
                  options={wallets.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${w.currency} ${Number(w.balance).toFixed(2)})`,
                  }))}
                  required
                />
                <Input
                  label={wSel ? `Monto en ${wSel.currency}` : 'Monto'}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={leg.monto}
                  onChange={(value) => {
                    const next = [...paymentLegs];
                    next[idx] = { ...next[idx], monto: value };
                    setPaymentLegs(next);
                  }}
                  required
                />
                {!esUsd && wSel && (
                  <Input
                    label={`Tasa: ${wSel.currency} por 1 USD (ej. 3600 si 1 USD = 3600 COP)`}
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={leg.tasa}
                    onChange={(value) => {
                      const next = [...paymentLegs];
                      next[idx] = { ...next[idx], tasa: value };
                      setPaymentLegs(next);
                    }}
                    required
                  />
                )}
                {equiv != null && (
                  <div className="text-xs text-gray-700">
                    Equivalente aproximado: <strong>${equiv.toFixed(2)} USD</strong>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-white text-sm">
            <div className="font-medium text-gray-800">
              Suma en USD (equivalente):{' '}
              <strong>
                $
                {paymentLegs
                  .reduce((sum, leg) => {
                    const w = wallets.find((x) => x.id === leg.wallet_id);
                    const m = parseFloat(leg.monto || '0');
                    if (!w || !Number.isFinite(m) || m <= 0) return sum;
                    if (w.currency === 'USD') return sum + m;
                    const t = parseFloat(leg.tasa || '0');
                    if (!Number.isFinite(t) || t <= 0) return sum;
                    return sum + m / t;
                  }, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <Input
            label="Nota (opcional, se añade al detalle de cada línea)"
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
                setPaymentError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        wide
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedMember(null);
        }}
        title={`Historial de pagos — ${selectedMember?.nombre}`}
      >
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto space-y-3 pr-1">
          {memberPayments.length === 0 ? (
            <p className="text-gray-500 py-6 text-center text-sm">No hay pagos registrados</p>
          ) : (
            pagosHistorialAgrupados.map((grupo) => {
              const p = grupo[0];
              const totalUsd = grupo.reduce((s, r) => {
                if (r.equipo_pago_equiv_usd != null && Number.isFinite(Number(r.equipo_pago_equiv_usd))) {
                  return s + Number(r.equipo_pago_equiv_usd);
                }
                if (r.moneda === 'USD') return s + Number(r.monto || 0);
                return s;
              }, 0);
              const comentarioUsuario = extractUsuarioComentarioFromNota(p.nota);
              const ajusteSistema = extractAjusteSistemaFromNota(p.nota);
              const tipoLabel =
                p.tipo_pago_equipo === 'adelanto'
                  ? 'Adelanto'
                  : p.tipo_pago_equipo === 'quincena_con_descuento'
                  ? 'Quincena (con descuento)'
                  : 'Quincena completa';
              const tipoClass =
                p.tipo_pago_equipo === 'adelanto'
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : p.tipo_pago_equipo === 'quincena_con_descuento'
                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                  : 'bg-green-100 text-green-900 border border-green-200';

              return (
                <article
                  key={p.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/80 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4 bg-white border-b border-gray-100">
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Fecha</div>
                      <div className="text-base font-semibold text-gray-900">{formatDateLocal(p.fecha)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${tipoClass}`}>{tipoLabel}</span>
                      <button
                        type="button"
                        onClick={() => deleteHistorialPago(p)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                        title="Eliminar este pago"
                        aria-label="Eliminar pago"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="w-full sm:w-auto sm:text-right">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Total equivalente</div>
                      <div className="text-xl font-bold text-gray-900 tabular-nums">
                        ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <span className="text-sm font-normal text-gray-500">USD</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Origen del dinero
                      </h4>
                      <ul className="space-y-2">
                        {grupo.map((r) => {
                          const w = wallets.find((x) => x.id === r.origen_wallet_id);
                          const equiv =
                            r.equipo_pago_equiv_usd != null && Number.isFinite(Number(r.equipo_pago_equiv_usd))
                              ? Number(r.equipo_pago_equiv_usd)
                              : r.moneda === 'USD'
                              ? Number(r.monto)
                              : null;
                          const tasa =
                            r.equipo_pago_tasa != null && Number(r.equipo_pago_tasa) > 0
                              ? Number(r.equipo_pago_tasa)
                              : null;
                          return (
                            <li
                              key={r.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg bg-white border border-gray-100 px-3 py-2.5 text-sm"
                            >
                              <div className="font-medium text-gray-800 min-w-0">
                                {w?.name ?? 'Wallet'}
                                <span className="text-gray-500 font-normal"> · {r.moneda}</span>
                              </div>
                              <div className="text-right sm:text-right tabular-nums space-y-0.5">
                                <div className="text-gray-900">
                                  −{Number(r.monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                                  {r.moneda}
                                </div>
                                {tasa != null && (
                                  <div className="text-xs text-gray-500">
                                    Tasa: {tasa.toLocaleString('en-US', { maximumFractionDigits: 4 })} {r.moneda}
                                    / USD
                                  </div>
                                )}
                                {equiv != null && (
                                  <div className="text-xs text-gray-600">
                                    Equiv.{' '}
                                    <span className="font-semibold text-gray-800">
                                      ${equiv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                      USD
                                    </span>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {comentarioUsuario ? (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Tu comentario
                        </h4>
                        <p className="text-sm text-gray-800 bg-white rounded-lg border border-gray-100 px-3 py-2 leading-relaxed">
                          {comentarioUsuario}
                        </p>
                      </div>
                    ) : null}

                    {ajusteSistema ? (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Registro automático (objetivo / picos)
                        </h4>
                        <p className="text-xs text-gray-700 bg-slate-100 rounded-lg border border-slate-200 px-3 py-2 leading-relaxed font-mono">
                          {ajusteSistema}
                        </p>
                      </div>
                    ) : null}

                    {!comentarioUsuario && !ajusteSistema && p.nota ? (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nota</h4>
                        <p className="text-sm text-gray-700 bg-white rounded-lg border border-gray-100 px-3 py-2 leading-relaxed">
                          {p.nota}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
