'use client';

import { useState } from 'react';
import { Customer } from '@/lib/hooks/useCustomers';

interface CustomersTableProps {
  customers: Customer[];
  loading: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
}

export function CustomersTable({
  customers,
  loading,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
}: CustomersTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (loading && customers.length === 0) {
    return <div className="text-center py-8">Cargando clientes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">NIF</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ciudad</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Términos</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{customer.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.email || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.nif || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.city || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.paymentTerms || '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onEdit(customer)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(customer.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Borrar
                  </button>
                  {deleteConfirm === customer.id && (
                    <div className="absolute bg-white border border-gray-300 rounded p-3 shadow-lg z-10">
                      <p className="text-sm mb-3">¿Confirmar borrado?</p>
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            onDelete(customer.id);
                            setDeleteConfirm(null);
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {customers.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">No hay clientes registrados</div>
      )}
    </div>
  );
}
