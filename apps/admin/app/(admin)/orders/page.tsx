'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Package, Search } from 'lucide-react';

type Order = {
  id: string;
  orderNumber: string;
  tenantName: string;
  status: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  active: 'bg-blue-100 text-blue-700',
  provisioning: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-200 text-red-800',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
        if (status) params.append('status', status);

        const res = await fetch(`/api/admin/orders?${params}`);
        if (!res.ok) throw new Error('Failed to load orders');

        const data = await res.json();
        setOrders(data.orders);
        setTotal(data.pagination.total);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [status, offset]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      if (res.ok) {
        // Refresh list
        setOffset(0);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Gestión de pedidos
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cola de pedidos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pedidos en {status ? `estado "${status}"` : 'todos los estados'} ({total} total)
            </p>
          </div>
          <Package className="h-12 w-12 text-[#2361d8]/20" />
        </div>
      </header>

      {/* Filtro de estado */}
      <div className="flex gap-3">
        {['', 'draft', 'pending', 'paid', 'active', 'provisioning', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setOffset(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              status === s
                ? 'bg-[#2361d8] text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {s || 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Pedido</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Tenant</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Estado</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Total</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Líneas</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Creado</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No hay pedidos
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-[#2361d8] hover:underline font-medium"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{order.tenantName}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_COLORS[order.status] || STATUS_COLORS.draft
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    €{parseFloat(order.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">{order.itemCount}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
                    >
                      <option value="draft">draft</option>
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="active">active</option>
                      <option value="provisioning">provisioning</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </main>
  );
}
