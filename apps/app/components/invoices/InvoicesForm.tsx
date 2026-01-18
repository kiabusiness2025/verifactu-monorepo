'use client';

import { useEffect, useState } from 'react';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { useArticles } from '@/lib/hooks/useArticles';
import { formatCurrency, formatNumber } from '@/src/lib/formatters';

interface InvoiceLineItem {
  articleId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export function InvoicesForm({ invoice, onSubmit, onCancel, loading }: any) {
  const { customers } = useCustomers();
  const { articles } = useArticles();

  const [formData, setFormData] = useState({
    customerId: '',
    number: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lineItems: [] as InvoiceLineItem[],
    notes: '',
    paymentTerms: '30',
  });

  const [selectedArticle, setSelectedArticle] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  const handleAddArticle = () => {
    if (!selectedArticle) return;

    const article = articles.find((a) => a.id === selectedArticle);
    if (!article) return;

    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        {
          articleId: selectedArticle,
          quantity: selectedQty,
          unitPrice: Number(article.unitPrice),
          taxRate: typeof article.taxRate === 'string' ? Number(article.taxRate) : article.taxRate,
          discount: 0,
        },
      ],
    });

    setSelectedArticle('');
    setSelectedQty(1);
  };

  const handleRemoveArticle = (index: number) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    return formData.lineItems.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice * (1 - line.discount / 100);
      return sum + lineTotal;
    }, 0);
  };

  const calculateTax = () => {
    return formData.lineItems.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice * (1 - line.discount / 100);
      return sum + lineTotal * line.taxRate;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
          <select
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Seleccionar cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura *</label>
          <input
            type="text"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            placeholder="VF-001"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Emisión *</label>
          <input
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento *</label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Líneas de Factura</h3>

        <div className="flex gap-2">
          <select
            value={selectedArticle}
            onChange={(e) => setSelectedArticle(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Seleccionar artículo...</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name} ({formatCurrency(Number(a.unitPrice))})
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={selectedQty}
            onChange={(e) => setSelectedQty(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Cantidad"
          />

          <button
            type="button"
            onClick={handleAddArticle}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Agregar
          </button>
        </div>

        {formData.lineItems.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Artículo</th>
                  <th className="px-4 py-2 text-right text-gray-600">Cantidad</th>
                  <th className="px-4 py-2 text-right text-gray-600">Precio</th>
                  <th className="px-4 py-2 text-right text-gray-600">IVA %</th>
                  <th className="px-4 py-2 text-right text-gray-600">Total</th>
                  <th className="px-4 py-2 text-right text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.map((line, idx) => {
                  const article = articles.find((a) => a.id === line.articleId);
                  const lineTotal = line.quantity * line.unitPrice * (1 - line.discount / 100);
                  return (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2">{article?.name}</td>
                      <td className="px-4 py-2 text-right">{line.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(line.taxRate * 100)}%</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(lineTotal)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveArticle(idx)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="bg-gray-50 px-4 py-3 flex justify-end gap-8">
              <div>
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">IVA</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(calculateTax())}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(calculateTotal() + calculateTax())}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20"
          placeholder="Notas internas o condiciones especiales..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading || formData.lineItems.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? 'Guardando...' : 'Guardar Factura'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
