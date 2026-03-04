'use client';

import { adminGet } from '@/lib/adminApi';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type SubscriptionRow = {
  id: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  tenantId: string;
  tenantName: string;
  tenantNif: string | null;
  plan: {
    id: number;
    code: string;
    name: string;
  };
};

type SubscriptionsResponse = {
  ok: boolean;
  total: number;
  items: SubscriptionRow[];
};

function fmtDate(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short' }).format(parsed);
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await adminGet<SubscriptionsResponse>(
          `/api/admin/subscriptions?limit=200&q=${encodeURIComponent(query)}`
        );
        if (!active) return;
        setItems(data.items ?? []);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar suscripciones');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [query]);

  const stats = useMemo(() => {
    const acc = { trial: 0, active: 0, past_due: 0, canceled: 0, total: items.length };
    for (const item of items) {
      const status = item.status.toLowerCase();
      if (status === 'trial') acc.trial += 1;
      else if (status === 'active') acc.active += 1;
      else if (status === 'past_due') acc.past_due += 1;
      else if (status === 'canceled') acc.canceled += 1;
    }
    return acc;
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Suscripciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gestión central de planes por empresa. La facturación operativa vive en cada tenant.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filtrar por empresa, plan, NIF o estado"
              className="h-9 w-80 rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            onClick={() => setQuery(searchInput.trim())}
            className="inline-flex h-9 items-center rounded-lg bg-[#0b6cfb] px-3 text-sm font-semibold text-white hover:bg-[#095edb]"
          >
            Filtrar
          </button>
          <Link
            href="/tenants"
            className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ir a empresas
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Trial" value={stats.trial} />
        <StatCard label="Activas" value={stats.active} />
        <StatCard label="Past due" value={stats.past_due} />
        <StatCard label="Canceladas" value={stats.canceled} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-slate-600">Cargando...</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">NIF</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Periodo</th>
                  <th className="px-3 py-2">Trial hasta</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium text-slate-900">{item.tenantName}</td>
                    <td className="px-3 py-2 text-slate-700">{item.tenantNif ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {item.plan.name} <span className="text-slate-400">({item.plan.code})</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {fmtDate(item.currentPeriodStart)} - {fmtDate(item.currentPeriodEnd)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{fmtDate(item.trialEndsAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/tenants/${item.tenantId}/billing`}
                        className="inline-flex rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No hay suscripciones para el filtro actual.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </article>
  );
}
