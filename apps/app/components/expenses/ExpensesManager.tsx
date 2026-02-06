'use client';

import { useExpenses } from '@/lib/hooks/useExpenses';
import { ExpensesTable } from './ExpensesTable';

export function ExpensesManager() {
  const { expenses, pagination, loading, error, fetchExpenses } = useExpenses();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Registro de Gastos</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
        Para registrar un gasto, habla con Isaak. Él valida si es deducible y lo clasifica.
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <ExpensesTable
        expenses={expenses}
        loading={loading}
        pagination={pagination}
        onPageChange={(page: number) => fetchExpenses(page)}
      />
    </div>
  );
}
