"use client";

import { useState } from "react";
import { formatCurrency, formatShortDate } from "@/src/lib/formatters";
import { useCustomers } from '@/lib/hooks/useCustomers';
import { CheckCircle, AlertCircle, Clock, QrCode } from 'lucide-react';
import { InvoiceQR } from './InvoiceQR';

export function InvoicesTable({ invoices, loading, pagination, onEdit, onDelete, onPageChange }: any) {
  const { customers } = useCustomers();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Desconocido';
  };

  const getVeriFactuBadge = (status?: string | null) => {
    if (!status) return null;
    
    const configs = {
      validated: { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', label: 'Validado' },
      pending: { icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
      error: { icon: AlertCircle, bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
      sent: { icon: Clock, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Enviado' }
    };

    const config = configs[status as keyof typeof configs];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
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
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-600 font-medium">Número</th>
              <th className="px-6 py-3 text-left text-gray-600 font-medium">Cliente</th>
              <th className="px-6 py-3 text-left text-gray-600 font-medium">Fecha</th>
              <th className="px-6 py-3 text-right text-gray-600 font-medium">Total</th>
              <th className="px-6 py-3 text-left text-gray-600 font-medium">Estado</th>
              <th className="px-6 py-3 text-center text-gray-600 font-medium">VeriFactu</th>
              <th className="px-6 py-3 text-right text-gray-600 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: any) => (
              <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{invoice.number}</td>
                <td className="px-6 py-3 text-gray-600">{getCustomerName(invoice.customerId)}</td>
                <td className="px-6 py-3 text-gray-600">{formatShortDate(invoice.issueDate)}</td>
                <td className="px-6 py-3 text-right font-medium text-gray-900">
                  {formatCurrency(invoice.amountGross || 0)}
                </td>
                <td className="px-6 py-3">
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    Pendiente
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  {invoice.verifactuStatus ? (
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      title="Ver código QR"
                    >
                      <QrCode className="w-4 h-4" />
                      {getVeriFactuBadge(invoice.verifactuStatus)}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Sin validar</span>
                  )}
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

      {/* Modal QR VeriFactu */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Factura {selectedInvoice.number}</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <InvoiceQR invoice={selectedInvoice} />
          </div>
        </div>
      )}
    </>
  );
}
