'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Supplier {
  id: string;
  name: string;
    nif: string | null;
}

interface NewExpenseFormProps {
  tenantId: string;
  tenantSlug: string;
  suppliers: Supplier[];
  defaultDate: string;
}

const EXPENSE_CATEGORIES = [
  'Suministros',
  'Transporte',
  'Alojamiento',
  'Alimentación',
  'Otros',
];

const TAX_RATES = ['0%', '4%', '10%', '21%'];

export function NewExpenseForm({
  tenantId,
  tenantSlug,
  suppliers,
  defaultDate,
}: NewExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: defaultDate,
    description: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    taxRate: '0.21',
    supplierId: '',
    reference: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.description.trim()) {
        setError('La descripción es obligatoria');
        return;
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError('El importe debe ser mayor a 0');
        return;
      }

      const taxRate = parseFloat(formData.taxRate);

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          date: formData.date,
          description: formData.description,
          category: formData.category,
          amount: parseFloat(formData.amount),
          taxRate,
          supplierId: formData.supplierId || undefined,
          reference: formData.reference || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error al crear el gasto');
        return;
      }

      // Redirect to expenses list
      router.push(`/t/${tenantSlug}/erp/expenses`);
    } catch (err) {
      setError('Error al crear el gasto');
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

      {/* Información básica */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Información del gasto</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe el gasto. Ej: Servicio de hosting para servidor..."
          />
        </div>
      </div>

      {/* Importe e impuestos */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Importe</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Importe *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de IVA *
            </label>
            <select
              name="taxRate"
              value={formData.taxRate}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TAX_RATES.map((rate) => {
                const rateValue = parseFloat(rate) / 100;
                return (
                  <option key={rate} value={rateValue.toString()}>
                    {rate}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Proveedor */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Proveedor (opcional)</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar proveedor
            </label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin asignar --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.nif ? `(${s.nif})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referencia
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número de albarán, factura..."
            />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Guardando...' : 'Crear gasto'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/t/${tenantSlug}/erp/expenses`)}
            disabled={loading}
            className="px-4 py-2 w-32 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
      </div>
    </form>
  );
}
