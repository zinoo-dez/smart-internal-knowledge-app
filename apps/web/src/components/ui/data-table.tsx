import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  keyExtractor?: (row: T, index: number) => string | number;
}

export function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found.',
  className,
  keyExtractor,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-white rounded-lg border border-slate-200 p-8 flex flex-col items-center justify-center space-y-3"
      >
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading records...</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden', className)}>
      <div
        tabIndex={0}
        role="region"
        aria-label="Scrollable data table"
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
      >
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} scope="col" className={cn('px-6 py-3.5', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const rowId = 'id' in row ? (row as any).id : rowIdx;
                const key = keyExtractor ? keyExtractor(row, rowIdx) : rowId;
                return (
                  <tr
                    key={key}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={cn('px-6 py-4 whitespace-nowrap', col.className)}>
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                          ? (row[col.accessorKey] as ReactNode)
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
