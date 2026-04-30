'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Unplug,
} from 'lucide-react';

type Deadline = {
  id: string;
  title: string;
  modelo: string;
  date: string;
  daysUntil: number;
  category: 'iva' | 'irpf' | 'is' | 'resumen_anual';
};

type Status = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  upcoming: Deadline[];
  googleConfigured: boolean;
};

const CATEGORY_COLORS: Record<Deadline['category'], string> = {
  iva: 'bg-blue-50 text-blue-700 border-blue-200',
  irpf: 'bg-violet-50 text-violet-700 border-violet-200',
  is: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  resumen_anual: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CATEGORY_LABELS: Record<Deadline['category'], string> = {
  iva: 'IVA',
  irpf: 'IRPF',
  is: 'IS',
  resumen_anual: 'Resumen anual',
};

function urgencyClass(days: number) {
  if (days <= 7) return 'text-rose-600 font-semibold';
  if (days <= 30) return 'text-amber-600 font-medium';
  return 'text-slate-500';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CalendarioPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/google/status');
      if (res.ok) setStatus((await res.json()) as Status);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Show toast if redirected back from OAuth
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'connected') setNotice('Google Calendar conectado correctamente.');
    if (g === 'error') setNotice('No se pudo conectar Google Calendar. Inténtalo de nuevo.');
  }, [load]);

  async function syncCalendar() {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await fetch('/api/isaak/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: new Date().getFullYear() }),
      });
      const data = (await res.json()) as { created?: number; skipped?: number; errors?: number };
      if (res.ok) {
        setNotice(
          `Sincronizado: ${data.created ?? 0} eventos creados, ${data.skipped ?? 0} ya existían${data.errors ? `, ${data.errors} errores` : ''}.`
        );
      } else {
        setNotice('Error al sincronizar. Comprueba la conexión con Google.');
      }
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!confirm('¿Desconectar Google Calendar?')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/isaak/google/disconnect', { method: 'DELETE' });
      setNotice('Google Calendar desconectado.');
      await load();
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Calendario Fiscal</h1>
        <p className="text-[12px] text-slate-500">
          Plazos tributarios del año · sincroniza con Google Calendar
        </p>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {/* Notice */}
        {notice && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {notice}
          </div>
        )}

        {/* Google Calendar connection card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <Calendar size={18} className="text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Google Calendar</div>
                {status?.connected ? (
                  <div className="text-xs text-slate-500">{status.email}</div>
                ) : (
                  <div className="text-xs text-slate-400">No conectado</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={11} />
                    Conectado
                  </span>
                  <button
                    onClick={() => void syncCalendar()}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2] disabled:opacity-60"
                  >
                    {syncing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={12} />
                    )}
                    Sincronizar
                  </button>
                  <button
                    onClick={() => void disconnect()}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Unplug size={12} />
                    Desconectar
                  </button>
                </>
              ) : status?.googleConfigured ? (
                <a
                  href="/api/isaak/google/auth"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d55c2]"
                >
                  <ExternalLink size={12} />
                  Conectar Google Calendar
                </a>
              ) : (
                <span className="text-xs text-slate-400">No disponible en este plan</span>
              )}
            </div>
          </div>
          {status?.connected && (
            <p className="mt-3 text-xs text-slate-500">
              Al sincronizar se crearán eventos en tu Google Calendar con recordatorios 7 días antes
              de cada plazo fiscal.
            </p>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-slate-500" />
              <span className="text-[12px] font-semibold text-slate-700">
                Próximos vencimientos (90 días)
              </span>
            </div>
          </div>
          {!status?.upcoming || status.upcoming.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              No hay vencimientos fiscales en los próximos 90 días.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {status.upcoming.map((d) => (
                <li key={d.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="mt-0.5 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {new Date(d.date).toLocaleDateString('es-ES', { month: 'short' })}
                    </div>
                    <div className="text-lg font-bold leading-none text-slate-800">
                      {new Date(d.date).getDate()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-800">{d.title}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[d.category]}`}
                      >
                        {CATEGORY_LABELS[d.category]}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{fmtDate(d.date)}</div>
                  </div>
                  <div className={`shrink-0 text-[11px] ${urgencyClass(d.daysUntil)}`}>
                    {d.daysUntil === 0
                      ? 'Hoy'
                      : d.daysUntil === 1
                        ? 'Mañana'
                        : `${d.daysUntil} días`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Full year summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-4">
          <p className="text-[11px] text-slate-500">
            El calendario incluye Mod. 303 (IVA trimestral), Mod. 130 (IRPF fraccionado autónomos),
            Mod. 111/115 (retenciones), Mod. 200 (Impuesto Sociedades) y resúmenes anuales
            390/180/190.{' '}
            <Link href="/settings?section=connections" className="text-[#2361d8] underline">
              Conecta Google Calendar
            </Link>{' '}
            para recibir recordatorios automáticos.
          </p>
        </div>
      </div>
    </div>
  );
}
