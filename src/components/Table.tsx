import { ReactNode, useState, useRef, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface Column {
  header: string;
  accessor: string;
  sortable?: boolean;
  render?: (value: any, row: any) => ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (accessor: string, order?: 'asc' | 'desc') => void;
}

export default function Table({ columns, data, onRowClick, sortBy, sortOrder, onSort }: TableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column, colIndex) => (
              <th
                key={`${column.accessor}-${colIndex}`}
                className="text-left py-3 px-4 text-sm font-semibold text-gray-700"
              >
                <div className="flex items-center gap-1">
                  {column.sortable && onSort ? (
                    <>
                      <span>{column.header}</span>
                      <div className="relative" ref={openDropdown === column.accessor ? dropdownRef : undefined}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown((prev) => (prev === column.accessor ? null : column.accessor));
                          }}
                          className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                          title="Ordenar"
                        >
                          <ArrowUpDown size={16} />
                        </button>
                        {openDropdown === column.accessor && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSort?.(column.accessor, 'asc');
                                setOpenDropdown(null);
                              }}
                            >
                              A-Z (menor a mayor)
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSort?.(column.accessor, 'desc');
                                setOpenDropdown(null);
                              }}
                            >
                              Z-A (mayor a menor)
                            </button>
                          </div>
                        )}
                      </div>
                      {sortBy === column.accessor && (
                        <span className="text-xs text-blue-600">
                          ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                        </span>
                      )}
                    </>
                  ) : (
                    column.header
                  )}
                </div>
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
                key={row?.id ?? rowIndex}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-100 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                {columns.map((column, colIndex) => (
                  <td key={`${column.accessor}-${colIndex}`} className="py-3 px-4 text-sm text-gray-900">
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
