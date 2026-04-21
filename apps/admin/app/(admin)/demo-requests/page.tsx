'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminGet } from '@/lib/adminApi';

type DemoRequestRow = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  companyName: string;
  phone: string | null;
  role: string | null;
  usesHolded: boolean;
  status: string;
  source: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONTACTED: 'Contactado',
  SCHEDULED: 'Agendado',
  COMPLETED: 'Completado',
  DISQUALIFIED: 'Descartado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONTACTED: 'bg-sky-100 text-sky-800',
  SCHEDULED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  DISQUALIFIED: 'bg-slate-100 text-slate-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DemoRequestsPage() {
  const [items, setItems] = useState<DemoRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, statusFilter, search]);

  useEffect(() => {
    const mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await adminGet<{ items: DemoRequestRow[] }>('/api/admin/demo-requests');
        if (mounted) setItems(res.items || []);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Solicitudes de demo</h1>
          <p className="mt-1 text-sm text-slate-600">
            Empresas que han pedido una demo del conector Holded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o empresa"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Holded</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-700">{item.companyName}</td>
                  <td className="px-4 py-3 text-slate-600">{item.email}</td>
                  <td className="px-4 py-3 text-slate-600">{item.usesHolded ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/demo-requests/${item.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={7}>
                    No hay solicitudes con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
