import { ReactNode } from 'react';

interface Column {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
}

export default function Table({ columns, data, onRowClick }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.accessor}
                className="text-left py-3 px-4 text-sm font-semibold text-gray-700"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 px-4 text-center text-gray-500">
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-100 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                {columns.map((column) => (
                  <td key={column.accessor} className="py-3 px-4 text-sm text-gray-900">
                    {column.render ? column.render(row[column.accessor], row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
