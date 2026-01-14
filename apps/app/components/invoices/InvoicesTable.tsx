'use client';

import { useCustomers } from '@/lib/hooks/useCustomers';

export function InvoicesTable({ invoices, loading, pagination, onEdit, onDelete, onPageChange }: any) {
  const { customers } = useCustomers();

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Desconocido';
  };

  if (invoices.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-4">No hay facturas registradas</p>
        <p className="text-sm text-gray-500">Comienza creando tu primera factura</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-gray-600 font-medium">Número</th>
            <th className="px-6 py-3 text-left text-gray-600 font-medium">Cliente</th>
            <th className="px-6 py-3 text-left text-gray-600 font-medium">Fecha</th>
            <th className="px-6 py-3 text-right text-gray-600 font-medium">Total</th>
            <th className="px-6 py-3 text-left text-gray-600 font-medium">Estado</th>
            <th className="px-6 py-3 text-right text-gray-600 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice: any) => (
            <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-900">{invoice.number}</td>
              <td className="px-6 py-3 text-gray-600">{getCustomerName(invoice.customerId)}</td>
              <td className="px-6 py-3 text-gray-600">{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</td>
              <td className="px-6 py-3 text-right font-medium text-gray-900">€{(invoice.amountGross || 0).toFixed(2)}</td>
              <td className="px-6 py-3">
                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Pendiente
                </span>
              </td>
              <td className="px-6 py-3 text-right">
                <button
                  onClick={() => onEdit(invoice)}
                  className="text-blue-600 hover:text-blue-800 mr-4"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(invoice.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination.pages > 1 && (
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-center gap-2">
          {Array.from({ length: pagination.pages }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => onPageChange(i + 1)}
              className={`px-3 py-1 rounded ${
                pagination.page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
