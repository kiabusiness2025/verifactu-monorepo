// V1 LAUNCH (2026-05-28) — Sprint B
//
// Página de alertas simplificada: solo próximos vencimientos AEAT y las
// alertas enviadas por el cron `fiscal-alerts`. Reemplaza al placeholder
// del Sprint A que reusaba `/fiscal`.
//
// Para flag off (V2+), `/fiscal` sigue siendo la página completa con
// auditoría e inspector. En V1 ese contenido queda oculto.
//
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

'use client';

import { useEffect, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, Clock, Loader2 } from 'lucide-react';

type Deadline = {
  id: string;
  title: string;
  modelo: string;
  date: string;
  daysUntil: number;
  category: 'iva' | 'irpf' | 'is' | 'resumen_anual';
  description: string;
};

type AlertRecord = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  dueDate: string | null;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  daysLeft: number | null;
};

type ApiResponse = {
  deadlines: Deadline[];
  alerts: AlertRecord[];
};

const CATEGORY_COLOR: Record<Deadline['category'], { bg: string; text: string; label: string }> = {
  iva: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'IVA' },
  irpf: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'IRPF' },
  is: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Sociedades' },
  resumen_anual: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Resumen' },
};

function urgencyClass(daysUntil: number): string {
  if (daysUntil <= 3) return 'text-rose-600';
  if (daysUntil <= 7) return 'text-amber-600';
  return 'text-slate-600';
}

function formatRelDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AlertasPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/isaak/fiscal/alerts', { credentials: 'include' });
        if (!res.ok) {
          setError(`No se pudieron cargar las alertas (status ${res.status}).`);
          return;
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Error de red al cargar alertas.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <div className="px-5 py-6 text-sm text-rose-600">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando alertas…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Header />

      <section className="px-5 py-5">
        <SectionTitle icon={CalendarDays} title="Próximos vencimientos AEAT" />
        {data.deadlines.length === 0 ? (
          <EmptyState text="No hay vencimientos en los próximos 120 días." />
        ) : (
          <ul className="space-y-2">
            {data.deadlines.slice(0, 8).map((d) => {
              const cat = CATEGORY_COLOR[d.category];
              return (
                <li
                  key={d.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${cat.bg} ${cat.text}`}
                  >
                    {cat.label} {d.modelo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">{d.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{d.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[11px] text-slate-400">{formatRelDate(d.date)}</p>
                    <p className={`text-[12px] font-semibold ${urgencyClass(d.daysUntil)}`}>
                      {d.daysUntil === 0 ? 'Hoy' : `en ${d.daysUntil} d`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="px-5 py-5">
        <SectionTitle icon={Bell} title="Alertas enviadas" />
        {data.alerts.length === 0 ? (
          <EmptyState text="Aún no hay alertas enviadas. Te avisaremos D-15, D-7, D-3 y D-1 antes de cada vencimiento." />
        ) : (
          <ul className="space-y-2">
            {data.alerts.slice(0, 10).map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <div className="mt-0.5">
                  {a.status === 'sent' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">{a.title}</p>
                  {a.body && (
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{a.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {a.sentAt ? `Enviada ${formatRelDate(a.sentAt)}` : 'Programada'}
                    {a.channel ? ` · ${a.channel}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Header() {
  return (
    <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
      <h1 className="text-[16px] font-semibold text-[#011c67]">Alertas fiscales</h1>
      <p className="text-[12px] text-slate-500">
        Te avisamos automáticamente 15, 7, 3 y 1 días antes de cada vencimiento AEAT.
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
      <Icon className="h-3.5 w-3.5" />
      {title}
    </h2>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <p className="text-[12px] text-slate-500">{text}</p>
    </div>
  );
}
