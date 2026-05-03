'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';

type OrderDetail = {
  id: string;
  orderNumber: string;
  tenantId: string;
  tenantName: string;
  status: string;
  totalAmount: string;
  lines: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
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

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = (params?.id ?? '') as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        // En producción, se necesitaría un endpoint GET /api/admin/orders/[id]
        // Por ahora, este es un placeholder
        setError('Endpoint de detalle no implementado');
      } catch (err) {
        setError('Error al cargar el pedido');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8">
          <p className="text-center text-slate-500">Cargando...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-[#2361d8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pedidos
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
          <p className="text-center text-red-700">{error}</p>
          <p className="mt-2 text-center text-sm text-red-600">
            El endpoint GET /api/admin/orders/[id] aún no está implementado.
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-[#2361d8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pedidos
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8">
          <p className="text-center text-slate-500">Pedido no encontrado</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-[#2361d8] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a pedidos
      </Link>

      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Detalle del pedido
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-600">Tenant: {order.tenantName}</p>
          </div>
          <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              STATUS_COLORS[order.status] || STATUS_COLORS.draft
            }`}
          >
            {order.status}
          </span>
        </div>
      </header>

      {/* Información resumida */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            €{parseFloat(order.totalAmount).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Creado</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {new Date(order.createdAt).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Líneas</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{order.lines.length}</p>
        </div>
      </div>

      {/* Líneas del pedido */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Líneas</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Servicio</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Cantidad</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Precio unitario</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.lines.map((line) => (
              <tr key={line.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-900">{line.itemName}</td>
                <td className="px-6 py-4 text-center text-slate-600">{line.quantity}</td>
                <td className="px-6 py-4 text-right text-slate-600">
                  €{parseFloat(line.unitPrice).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                  €{parseFloat(line.totalPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-right text-sm text-slate-500">
        Actualizado: {new Date(order.updatedAt).toLocaleDateString('es-ES')}
      </div>
    </main>
  );
}
