'use client';

import { useState } from 'react';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { CustomersTable } from './CustomersTable';
import { CustomersForm } from './CustomersForm';

export function CustomersManager() {
  const { customers, pagination, loading, error, fetchCustomers, createCustomer, updateCustomer, deleteCustomer } =
    useCustomers();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const handleCreate = async (data: any) => {
    try {
      await createCustomer(data);
      setShowForm(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      if (editingCustomer) {
        await updateCustomer((editingCustomer as any).id, data);
        setShowForm(false);
        setEditingCustomer(null);
      }
    } catch (err) {
      console.error('Failed to update customer:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Cliente'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {showForm ? (
        <CustomersForm
          customer={editingCustomer}
          onSubmit={editingCustomer ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          loading={loading}
        />
      ) : (
        <>
          <CustomersTable
            customers={customers}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={(page) => fetchCustomers(page)}
          />
        </>
      )}
    </div>
  );
}
