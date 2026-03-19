'use client';

import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface Customer {
  id: string;
  name: string;
  nif: string | null;
  email: string | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface NewInvoiceFormProps {
  tenantId: string;
  tenantSlug: string;
  customers: Customer[];
  nextNumber: string;
  defaultIssueDate: string;
  defaultDueDate: string;
}

export function NewInvoiceForm({
  tenantId,
  tenantSlug,
  customers,
  nextNumber,
  defaultIssueDate,
  defaultDueDate,
}: NewInvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerNif: '',
    number: nextNumber,
    issueDate: defaultIssueDate,
    dueDate: defaultDueDate,
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: Math.random().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.21,
    },
  ]);

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find((c) => c.id === customerId);

    setFormData((prev) => ({
      ...prev,
      customerId,
      customerName: customer?.name || '',
      customerNif: customer?.nif || '',
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0.21,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const calculateTotals = () => {
    let amountNet = 0;
    let amountTax = 0;

    lineItems.forEach((item) => {
      const lineNet = item.quantity * item.unitPrice;
      const lineTax = lineNet * item.taxRate;

      amountNet += lineNet;
      amountTax += lineTax;
    });

    return {
      amountNet: Math.round(amountNet * 100) / 100,
      amountTax: Math.round(amountTax * 100) / 100,
      amountGross: Math.round((amountNet + amountTax) * 100) / 100,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.customerName.trim()) {
        setError('El nombre del cliente es obligatorio');
        return;
      }

      if (lineItems.some((item) => !item.description.trim())) {
        setError('Todos los artículos deben tener una descripción');
        return;
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          customerId: formData.customerId || undefined,
          customerName: formData.customerName,
          customerNif: formData.customerNif || undefined,
          number: formData.number,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          items: lineItems,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error al crear la factura');
        return;
      }

      // Redirect to invoices list
      router.push(`/t/${tenantSlug}/erp/invoices`);
    } catch (err) {
      setError('Error al crear la factura');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Cliente */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Cliente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar cliente
            </label>
            <select
              value={formData.customerId}
              onChange={handleCustomerChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin asignar --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.nif ? `(${c.nif})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre de la empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">NIF</label>
            <input
              type="text"
              name="customerNif"
              value={formData.customerNif}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="A12345678"
            />
          </div>
        </div>
      </div>

      {/* Datos factura */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Datos de la factura</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha emisión *</label>
            <input
              type="date"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha vencimiento
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Líneas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Artículos</h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Agregar línea
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Descripción"
                  value={item.description}
                  onChange={(e) => handleLineChange(item.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-20">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Cantidad"
                  value={item.quantity}
                  onChange={(e) => handleLineChange(item.id, 'quantity', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-28">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio"
                  value={item.unitPrice}
                  onChange={(e) => handleLineChange(item.id, 'unitPrice', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-20">
                <select
                  value={item.taxRate}
                  onChange={(e) => handleLineChange(item.id, 'taxRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="0">0%</option>
                  <option value="0.04">4%</option>
                  <option value="0.10">10%</option>
                  <option value="0.21">21%</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveLine(item.id)}
                disabled={lineItems.length === 1}
                className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-right">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{totals.amountNet.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">IVA</span>
          <span className="font-medium">{totals.amountTax.toFixed(2)} €</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-blue-600">{totals.amountGross.toFixed(2)} €</span>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Notas internas o condiciones especiales..."
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? 'Guardando...' : 'Crear factura'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/t/${tenantSlug}/erp/invoices`)}
          disabled={loading}
          className="px-4 py-2 w-32 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
