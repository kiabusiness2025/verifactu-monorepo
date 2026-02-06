"use client";

import { formatCurrency, formatNumber, formatShortDate } from "@/src/lib/formatters";

interface ExpensesTableProps {
  expenses: any[];
  loading: boolean;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
}

export function ExpensesTable({
  expenses,
  loading,
  pagination,
  onPageChange,
}: ExpensesTableProps) {
  if (loading && expenses.length === 0) {
    return <div className="text-center py-8">Cargando gastos...</div>;
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalTax = expenses.reduce((sum, e) => sum + parseFloat(e.amount) * parseFloat(e.taxRate), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Gastos</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">IVA Soportado</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(totalTax)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Registros</p>
          <p className="text-2xl font-bold text-green-900">{formatNumber(pagination.total)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Descripción</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Proveedor</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Importe</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">IVA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatShortDate(expense.date)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{expense.description}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{expense.category}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{expense.supplier?.name || '-'}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                  {formatCurrency(parseFloat(expense.amount))}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">
                  {formatCurrency(parseFloat(expense.amount) * parseFloat(expense.taxRate))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                page === pagination.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {expenses.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">No hay gastos registrados</div>
      )}
    </div>
  );
}
