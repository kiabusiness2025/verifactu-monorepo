'use client';

import { useState } from 'react';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { ExpensesTable } from './ExpensesTable';
import { ExpensesForm } from './ExpensesForm';

export function ExpensesManager() {
  const { expenses, pagination, loading, error, fetchExpenses, createExpense, updateExpense, deleteExpense } =
    useExpenses();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const handleCreate = async (data: any) => {
    try {
      await createExpense(data);
      setShowForm(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Failed to create expense:', err);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      if (editingExpense) {
        await updateExpense((editingExpense as any).id, data);
        setShowForm(false);
        setEditingExpense(null);
      }
    } catch (err) {
      console.error('Failed to update expense:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Registro de Gastos</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Gasto'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {showForm ? (
        <ExpensesForm
          expense={editingExpense}
          onSubmit={editingExpense ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          loading={loading}
        />
      ) : (
        <>
          <ExpensesTable
            expenses={expenses}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={(page) => fetchExpenses(page)}
          />
        </>
      )}
    </div>
  );
}
