import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Table from '../components/Table';
import { Movimiento } from '../types';

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadMovimientos();
  }, [filter]);

  async function loadMovimientos() {
    try {
      let query = supabase
        .from('movimientos')
        .select('*, equipo(nombre)')
        .order('fecha', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('tipo', filter);
      }

      const { data } = await query;
      if (data) setMovimientos(data);
    } catch (error) {
      console.error('Error loading movimientos:', error);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES'),
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
    </div>
  );
}
