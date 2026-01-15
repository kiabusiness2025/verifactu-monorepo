'use client';

import { useState } from 'react';
import { useSuppliers } from '@/lib/hooks/useSuppliers';
import { SuppliersTable } from './SuppliersTable';
import { SuppliersForm } from './SuppliersForm';

export function SuppliersManager() {
  const { suppliers, pagination, loading, error, fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } =
    useSuppliers();
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const handleCreate = async (data: any) => {
    try {
      await createSupplier(data);
      setShowForm(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error('Failed to create supplier:', err);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      if (editingSupplier) {
        await updateSupplier((editingSupplier as any).id, data);
        setShowForm(false);
        setEditingSupplier(null);
      }
    } catch (err) {
      console.error('Failed to update supplier:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplier(id);
    } catch (err) {
      console.error('Failed to delete supplier:', err);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Proveedores</h1>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Proveedor'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {showForm ? (
        <SuppliersForm
          supplier={editingSupplier}
          onSubmit={editingSupplier ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingSupplier(null);
          }}
          loading={loading}
        />
      ) : (
        <>
          <SuppliersTable
            suppliers={suppliers}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={(page: number) => fetchSuppliers(page)}
          />
        </>
      )}
    </div>
  );
}
