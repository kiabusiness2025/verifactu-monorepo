'use client';

import { useState } from 'react';
import { InvoicesTable } from './InvoicesTable';
import { InvoicesForm } from './InvoicesForm';

export function InvoicesManager() {
  const [showForm, setShowForm] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });

  const handleCreate = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newInvoice = await response.json();
        setInvoices([newInvoice, ...invoices]);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta factura?')) return;

    try {
      const response = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setInvoices(invoices.filter((inv) => inv.id !== id));
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Facturas de Venta</h1>
        {!showForm && (
          <button
            onClick={() => {
              setEditingInvoice(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Nueva Factura
          </button>
        )}
      </div>

      {showForm ? (
        <InvoicesForm
          invoice={editingInvoice}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      ) : (
        <InvoicesTable
          invoices={invoices}
          loading={loading}
          pagination={pagination}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPageChange={(page) => setPagination({ ...pagination, page })}
        />
      )}
    </div>
  );
}
