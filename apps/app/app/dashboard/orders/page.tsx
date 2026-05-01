'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type OrderLine = {
  id: string;
  quantity: number;
  unitAmount: string | number;
  totalAmount: string | number;
  catalogItem?: { name: string } | null;
};

type Order = {
  id: string;
  status: string;
  buyerName: string | null;
  buyerEmail: string | null;
  sourceChannel: string | null;
  currency: string;
  subtotalAmount: string | number | null;
  taxAmount: string | number | null;
  totalAmount: string | number | null;
  paidAt: string | null;
  provisionedAt: string | null;
  createdAt: string;
  lines: OrderLine[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  paid: 'Pagado',
  provisioning: 'Activando',
  active: 'Activo',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'Fallido',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 border border-green-200',
    active: 'bg-blue-50 text-blue-700 border border-blue-200',
    provisioning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
    refunded: 'bg-slate-100 text-slate-500 border border-slate-200',
    failed: 'bg-red-50 text-red-600 border border-red-200',
    draft: 'bg-slate-100 text-slate-500 border border-slate-200',
  };
  const icons: Record<string, React.ReactNode> = {
    paid: <CheckCircle className="h-3 w-3" />,
    active: <CheckCircle className="h-3 w-3" />,
    provisioning: <Clock className="h-3 w-3" />,
    pending: <Clock className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
    failed: <AlertCircle className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}
    >
      {icons[status]}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatAmount(amount: string | number | null, currency: string) {
  if (amount === null || amount === undefined) return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount as number);
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency ?? 'EUR',
  }).format(n);
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/orders?limit=50', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('No hemos podido cargar tus pedidos.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
          <ShoppingBag className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Mis pedidos</h1>
          <p className="text-xs text-slate-500">Historial de contrataciones y activaciones</p>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Todavía no hay pedidos</p>
          <p className="mt-1 text-xs text-slate-400">
            Cuando contrates un plan o servicio aparecerá aquí.
          </p>
          <Link
            href="/suscripciones"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0b6cfb] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#095edb]"
          >
            Ver planes
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => {
              const firstName = order.lines[0]?.catalogItem?.name ?? 'Pedido';
              return (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{firstName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-semibold text-slate-700">
                        {formatAmount(order.totalAmount, order.currency)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
