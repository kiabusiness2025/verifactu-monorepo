'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Package,
} from 'lucide-react';

type OrderLine = {
  id: string;
  quantity: number;
  unitAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  catalogItem?: { id: string; name: string; slug: string } | null;
};

type Order = {
  id: string;
  status: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  sourceChannel: string | null;
  currency: string;
  subtotalAmount: string | number | null;
  taxAmount: string | number | null;
  totalAmount: string | number | null;
  paidAt: string | null;
  provisionedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  provisioning: 'Activando acceso',
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
    paid: <CheckCircle className="h-3.5 w-3.5" />,
    active: <CheckCircle className="h-3.5 w-3.5" />,
    provisioning: <Clock className="h-3.5 w-3.5" />,
    pending: <Clock className="h-3.5 w-3.5" />,
    cancelled: <XCircle className="h-3.5 w-3.5" />,
    failed: <AlertCircle className="h-3.5 w-3.5" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}
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
    month: 'long',
    year: 'numeric',
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('not_found');
        return r.json();
      })
      .then((data) => {
        setOrder(data.order ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError('No hemos podido cargar el detalle de este pedido.');
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Back */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Todos los pedidos
      </Link>

      {loading && (
        <div className="space-y-3">
          <div className="h-10 w-1/3 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && order && (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">
                  Pedido #{order.id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Summary card */}
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Resumen
              </p>
            </div>
            <div className="px-4">
              {order.buyerName && <Row label="Nombre" value={order.buyerName} />}
              {order.buyerEmail && <Row label="Email" value={order.buyerEmail} />}
              <Row label="Canal" value={order.sourceChannel ?? '—'} />
              <Row label="Divisa" value={order.currency} />
              <Row label="Subtotal" value={formatAmount(order.subtotalAmount, order.currency)} />
              <Row label="IVA" value={formatAmount(order.taxAmount, order.currency)} />
              <Row
                label="Total"
                value={
                  <span className="text-base font-bold text-slate-900">
                    {formatAmount(order.totalAmount, order.currency)}
                  </span>
                }
              />
              {order.paidAt && <Row label="Pagado el" value={formatDate(order.paidAt)} />}
              {order.provisionedAt && (
                <Row label="Activado el" value={formatDate(order.provisionedAt)} />
              )}
              {order.cancelledAt && (
                <Row label="Cancelado el" value={formatDate(order.cancelledAt)} />
              )}
            </div>
          </div>

          {/* Lines */}
          {order.lines.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Líneas
                </p>
              </div>
              <ul className="divide-y divide-slate-100">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50">
                      <Package className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {line.catalogItem?.name ?? 'Servicio'}
                      </p>
                      <p className="text-xs text-slate-400">Cantidad: {line.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatAmount(line.totalAmount, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
