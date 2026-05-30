'use client';

// V1.9.2 — Cabecera resumen del dashboard del asesor.
//
// Se monta encima del listado de clientes (AdvisorDashboardClient).
// Muestra contadores, próximos vencimientos AEAT y atajos a los
// últimos clientes editados.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  KeyRound,
  Loader2,
  Mail,
  Users,
} from 'lucide-react';

type Dashboard = {
  totals: {
    clients: number;
    withHolded: number;
    withoutHolded: number;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    modelo: string;
    date: string;
    daysUntil: number;
    category: string;
  }>;
  recentClients: Array<{
    id: string;
    alias: string;
    companyName: string | null;
    nif: string | null;
    hasHolded: boolean;
    updatedAt: string;
  }>;
};

export default function AdvisorDashboardSummary() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/isaak/advisor/dashboard', { credentials: 'include' });
      if (res.ok) setData((await res.json()) as Dashboard);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const switchToClient = useCallback(async (id: string) => {
    setSwitching(id);
    try {
      await fetch(`/api/isaak/advisor/clients/${id}/switch`, { method: 'POST' });
      window.location.href = '/chat';
    } catch {
      setSwitching(null);
    }
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (data.totals.clients === 0) return null; // sin clientes, no hay nada que resumir

  return (
    <div className="space-y-4 px-5 py-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Clientes"
          value={String(data.totals.clients)}
          color="blue"
        />
        <KpiCard
          icon={<KeyRound className="h-4 w-4" />}
          label="Con Holded"
          value={`${data.totals.withHolded}/${data.totals.clients}`}
          color="green"
        />
        <KpiCard
          icon={<Building2 className="h-4 w-4" />}
          label="Sin Holded"
          value={String(data.totals.withoutHolded)}
          color={data.totals.withoutHolded > 0 ? 'amber' : 'blue'}
        />
      </div>

      {/* Atajos */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/advisor/cartas"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#2361d8]/40 hover:bg-[#2361d8]/5 hover:text-[#2361d8]"
        >
          <Mail className="h-3.5 w-3.5" />
          Cartas masivas
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Próximos vencimientos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-slate-900">
            <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
            Próximos vencimientos AEAT
          </h3>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">
              Sin vencimientos en los próximos 45 días.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {data.upcomingDeadlines.map((d) => {
                const urgent = d.daysUntil <= 7;
                const warn = d.daysUntil <= 14;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`flex h-4 w-9 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold text-white ${
                          urgent
                            ? 'bg-rose-500'
                            : warn
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                        }`}
                      >
                        {d.daysUntil}d
                      </span>
                      <span className="truncate text-slate-700">{d.title}</span>
                    </div>
                    <span className="flex-shrink-0 text-slate-400">{d.date}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Clientes recientes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-slate-900">
            <Users className="h-3.5 w-3.5 text-[#2361d8]" />
            Clientes recientes
          </h3>
          <ul className="mt-2 space-y-1.5">
            {data.recentClients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void switchToClient(c.id)}
                  disabled={switching === c.id}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-[11px] transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[#2361d8]/8">
                      <Building2 className="h-3 w-3 text-[#2361d8]" />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">
                        {c.alias}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {c.companyName ?? c.nif ?? 'Sin nombre'}
                      </span>
                    </div>
                  </div>
                  <span className="flex flex-shrink-0 items-center gap-1 text-[10px] font-medium text-[#2361d8] opacity-0 transition group-hover:opacity-100">
                    {switching === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        Activar
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const COLORS = {
  blue: { bg: 'bg-[#2361d8]/10', text: 'text-[#2361d8]' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
} as const;

function KpiCard({
  icon,
  label,
  value,
  color = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: keyof typeof COLORS;
}) {
  const c = COLORS[color];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-lg font-bold text-[#011c67]">{value}</p>
    </div>
  );
}
