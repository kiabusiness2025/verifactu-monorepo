'use client';

import { useState, useEffect } from 'react';

interface ExpensesFormProps {
  expense?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ExpensesForm({ expense, onSubmit, onCancel, loading = false }: ExpensesFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Suministros',
    amount: '0',
    taxRate: '0.21',
    supplierId: '',
    accountCode: '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        ...expense,
        date: new Date(expense.date).toISOString().split('T')[0],
        amount: expense.amount.toString(),
        taxRate: expense.taxRate.toString(),
      });
    }
  }, [expense]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900">{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Suministros">Suministros</option>
            <option value="Viajes">Viajes</option>
            <option value="Teléfono">Teléfono</option>
            <option value="Servicios">Servicios</option>
            <option value="Software">Software</option>
            <option value="Hardware">Hardware</option>
            <option value="Alquiler">Alquiler</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Seguros">Seguros</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detalle del gasto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Importe *</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
          <input
            type="number"
            name="taxRate"
            value={parseFloat(formData.taxRate) * 100}
            onChange={(e) => {
              const value = (parseFloat(e.target.value) / 100).toString();
              setFormData((prev) => ({ ...prev, taxRate: value }));
            }}
            step="1"
            min="0"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="21"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <input
            type="text"
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ID del proveedor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código Contable</label>
          <input
            type="text"
            name="accountCode"
            value={formData.accountCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="6001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
          <input
            type="text"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Factura #, recibo, etc"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Información adicional..."
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400"
        >
          {loading ? 'Guardando...' : expense ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
