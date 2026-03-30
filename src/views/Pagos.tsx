import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { Plus, Upload, Trash2 } from 'lucide-react';
import { Pago, Cliente, Wallet } from '../types';
import { formatDateLocal, parseDateLocal } from '../lib/dateUtils';
import { formatDiasCorteQuincenal } from '../lib/dateUtils';

interface PagoWithCliente extends Pago {
  cliente?: Cliente;
}

function getPeriodoReferencia(periodoInput: string): string {
  const [year, month] = periodoInput.split('-');
  return `${year}-${month}-01`;
}

function getPeriodoInputFromIso(isoDate?: string): string {
  if (!isoDate) return '';
  return isoDate.slice(0, 7);
}

export default function Pagos() {
  const [pagos, setPagos] = useState<PagoWithCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    monto: '',
    metodo: '',
    moneda: 'USD',
    wallet_id: '',
    nota: '',
    fecha: new Date().toISOString().split('T')[0],
    periodo: new Date().toISOString().slice(0, 7),
    quincena_numero: '1',
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
    setSubmitError(null);
    try {
      const cliente = clientes.find((c) => c.id === formData.cliente_id);
      if (!cliente) return;

      const montoNuevo = parseFloat(formData.monto);
      if (!Number.isFinite(montoNuevo) || montoNuevo <= 0) return;
      const periodoReferencia = getPeriodoReferencia(formData.periodo);
      const esQuincenal = cliente.frecuencia === 'quincenal';
      const quincenaNumero = esQuincenal ? Number(formData.quincena_numero) : null;
      if (esQuincenal && quincenaNumero !== 1 && quincenaNumero !== 2) {
        setSubmitError('Debes seleccionar quincena 1 o 2 para clientes quincenales.');
        return;
      }
      const abonosPeriodo = pagos
        .filter(
          (p) =>
            p.cliente_id === formData.cliente_id &&
            getPeriodoInputFromIso(p.periodo_referencia) === formData.periodo &&
            (esQuincenal ? Number(p.quincena_numero) === quincenaNumero : true)
        )
        .reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const totalLuegoRegistro = abonosPeriodo + montoNuevo;
      const objetivoPeriodo = esQuincenal ? cliente.monto_esperado / 2 : cliente.monto_esperado;
      const completaPeriodo = totalLuegoRegistro >= objetivoPeriodo;

      const pagoData = {
        cliente_id: formData.cliente_id,
        monto: montoNuevo,
        metodo: formData.metodo,
        moneda: formData.moneda,
        wallet_id: formData.wallet_id,
        nota: formData.nota || null,
        fecha: new Date(formData.fecha).toISOString(),
        periodo_referencia: periodoReferencia,
        quincena_numero: esQuincenal ? (quincenaNumero as 1 | 2) : null,
        tipo_registro: completaPeriodo ? ('completado' as const) : ('abono' as const),
      };

      const { error: pagoError } = await supabase.from('pagos').insert(pagoData);
      if (pagoError) {
        setSubmitError(pagoError.message);
        return;
      }

      const pagoFecha = formData.fecha;
      const fechaPago = parseDateLocal(pagoFecha);
      const ultimoPago = parseDateLocal(cliente?.ultimo_pago);
      const debeActualizar = !ultimoPago || (fechaPago && fechaPago > ultimoPago);
      if (debeActualizar) {
        await supabase
          .from('clientes')
          .update({ ultimo_pago: pagoFecha })
          .eq('id', formData.cliente_id);
      }

      const wallet = wallets.find((w) => w.id === formData.wallet_id);
      if (wallet) {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: wallet.balance + parseFloat(formData.monto) })
          .eq('id', formData.wallet_id);
        if (walletError) {
          setSubmitError(`Pago registrado, pero falló actualizar wallet: ${walletError.message}`);
          return;
        }
      }

      setShowModal(false);
      setSubmitError(null);
      setFormData({
        cliente_id: '',
        monto: '',
        metodo: '',
        moneda: 'USD',
        wallet_id: '',
        nota: '',
        fecha: new Date().toISOString().split('T')[0],
        periodo: new Date().toISOString().slice(0, 7),
        quincena_numero: '1',
      });
      loadData();
    } catch (error) {
      console.error('Error creating pago:', error);
      setSubmitError('Error inesperado creando pago. Revisa consola para más detalles.');
    }
  }

  async function deletePago(pago: PagoWithCliente) {
    if (!confirm('¿Eliminar este pago? Se revertirá el monto en la wallet y se actualizará la fecha de último pago del cliente.')) return;
    try {
      const wallet = wallets.find((w) => w.id === pago.wallet_id);
      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance - pago.monto })
          .eq('id', pago.wallet_id);
      }

      await supabase.from('pagos').delete().eq('id', pago.id);

      const { data: ultimos } = await supabase
        .from('pagos')
        .select('fecha')
        .eq('cliente_id', pago.cliente_id)
        .order('fecha', { ascending: false })
        .limit(1);

      const nuevaUltima =
        ultimos && ultimos.length > 0 ? ultimos[0].fecha.split('T')[0] : null;
      await supabase.from('clientes').update({ ultimo_pago: nuevaUltima }).eq('id', pago.cliente_id);

      loadData();
    } catch (error) {
      console.error('Error al eliminar pago:', error);
    }
  }

  const metodosPago = [
    { value: 'Zelle', label: 'Zelle' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'USDT', label: 'USDT' },
    { value: 'Zinli', label: 'Zinli' },
    { value: 'Transferencia', label: 'Transferencia' },
  ];

  const selectedCliente = clientes.find((c) => c.id === formData.cliente_id);
  const selectedClienteEsQuincenal = selectedCliente?.frecuencia === 'quincenal';
  const quincenaSeleccionada = Number(formData.quincena_numero);
  const abonosPeriodoActual = pagos
    .filter(
      (p) =>
        p.cliente_id === formData.cliente_id &&
        getPeriodoInputFromIso(p.periodo_referencia) === formData.periodo &&
        (selectedClienteEsQuincenal ? Number(p.quincena_numero) === quincenaSeleccionada : true)
    )
    .reduce((acc, p) => acc + Number(p.monto || 0), 0);
  const objetivoPeriodoActual = selectedCliente
    ? selectedCliente.frecuencia === 'quincenal'
      ? selectedCliente.monto_esperado / 2
      : selectedCliente.monto_esperado
    : 0;
  const restantePeriodoActual = selectedCliente
    ? Math.max(0, objetivoPeriodoActual - abonosPeriodoActual)
    : 0;
  const montoDigitado = parseFloat(formData.monto || '0');
  const restanteLuegoRegistro = selectedCliente
    ? Math.max(0, restantePeriodoActual - montoDigitado)
    : 0;

  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value: string) => formatDateLocal(value),
    },
    {
      header: 'Cliente',
      accessor: 'cliente',
      render: (_: any, row: PagoWithCliente) => row.cliente?.nombre || '-',
    },
    {
      header: 'Período',
      accessor: 'periodo_referencia',
      render: (_: string, row: PagoWithCliente) => {
        const periodo = row.periodo_referencia ? row.periodo_referencia.slice(0, 7) : '-';
        return row.quincena_numero ? `${periodo} Q${row.quincena_numero}` : periodo;
      },
    },
    {
      header: 'Monto',
      accessor: 'monto',
      render: (value: number, row: Pago) =>
        `${row.moneda} $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    {
      header: 'Tipo',
      accessor: 'tipo_registro',
      render: (value: string, row: PagoWithCliente) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'completado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {value === 'completado' ? (row.quincena_numero ? 'Completa quincena' : 'Completa mes') : 'Abono'}
        </span>
      ),
    },
    { header: 'Método', accessor: 'metodo' },
    {
      header: 'Nota',
      accessor: 'nota',
      render: (value: string) => value || '-',
    },
    {
      header: '',
      accessor: 'id',
      render: (_: unknown, row: PagoWithCliente) => (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            void deletePago(row);
          }}
          aria-label="Eliminar pago"
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
          {submitError && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
              <div className="font-semibold mb-1">No se pudo registrar el pago</div>
              <div className="break-words">{submitError}</div>
              <div className="mt-1 text-red-700">
                Importante: si ves este error, no se debe tocar el saldo de la wallet.
              </div>
            </div>
          )}
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
            step="0.01"
            min="0.01"
            value={formData.monto}
            onChange={(value) => setFormData({ ...formData, monto: value })}
            required
          />

          <Input
            label="Período a aplicar (mes)"
            type="month"
            value={formData.periodo}
            onChange={(value) => setFormData({ ...formData, periodo: value })}
            required
          />

          {selectedClienteEsQuincenal && (
            <>
              <Select
                label="Quincena"
                value={formData.quincena_numero}
                onChange={(value) => setFormData({ ...formData, quincena_numero: value })}
                options={[
                  { value: '1', label: 'Primera quincena' },
                  { value: '2', label: 'Segunda quincena' },
                ]}
                required
              />
              {selectedCliente?.fecha_corte && (
                <div className="mb-4 -mt-2 text-xs text-blue-700">
                  Fechas de corte estimadas: {formatDiasCorteQuincenal(selectedCliente.fecha_corte)}
                </div>
              )}
            </>
          )}

          {selectedCliente && (
            <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900">
              <div className="font-semibold mb-1">
                Estado del período {formData.periodo}
                {selectedClienteEsQuincenal ? ` - Q${formData.quincena_numero}` : ''}
              </div>
              <div>
                Monto esperado {selectedClienteEsQuincenal ? 'de esta quincena' : ''}:{' '}
                {selectedCliente.moneda} $
                {objetivoPeriodoActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div>
                Abonado acumulado: {selectedCliente.moneda} $
                {abonosPeriodoActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div>
                Restante actual: {selectedCliente.moneda} $
                {restantePeriodoActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 font-medium">
                {montoDigitado > 0
                  ? restanteLuegoRegistro === 0
                    ? 'Este registro completaria el pago del mes.'
                    : `Luego de este abono, faltarian ${selectedCliente.moneda} $${restanteLuegoRegistro.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}.`
                  : 'Ingresa monto para simular el saldo luego del registro.'}
              </div>
            </div>
          )}

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
