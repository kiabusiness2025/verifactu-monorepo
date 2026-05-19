'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Smartphone,
} from 'lucide-react';

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
  body: string;
  dueDate: string | null;
  channel: 'email' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'read' | 'dismissed';
  sentAt: string | null;
  createdAt: string;
  daysLeft: number | null;
};

const CATEGORY_BADGE: Record<Deadline['category'], string> = {
  iva: 'bg-blue-50 text-blue-700 border-blue-200',
  irpf: 'bg-violet-50 text-violet-700 border-violet-200',
  is: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  resumen_anual: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CATEGORY_LABEL: Record<Deadline['category'], string> = {
  iva: 'IVA',
  irpf: 'IRPF',
  is: 'Soc.',
  resumen_anual: 'Resumen',
};

const CHANNEL_ICON: Record<AlertRecord['channel'], React.ReactNode> = {
  email: <Mail size={12} />,
  push: <Smartphone size={12} />,
  in_app: <Bell size={12} />,
};

function urgencyBadge(days: number) {
  if (days === 0) return 'text-rose-700 font-bold';
  if (days <= 3) return 'text-rose-600 font-semibold';
  if (days <= 7) return 'text-amber-600 font-medium';
  return 'text-slate-500';
}

function urgencyLabel(days: number) {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days} días`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function FiscalAlertsPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/fiscal/alerts');
      if (res.ok) {
        const data = (await res.json()) as { deadlines: Deadline[]; alerts: AlertRecord[] };
        setDeadlines(data.deadlines ?? []);
        setAlerts(data.alerts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nextUrgent = deadlines.find((d) => d.daysUntil <= 7);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Alertas Fiscales</h1>
        <p className="text-[12px] text-slate-500">
          Plazos tributarios y notificaciones enviadas por Isaak
        </p>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {/* Urgent banner */}
        {nextUrgent && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-rose-800">
                {nextUrgent.daysUntil === 0
                  ? 'Vence hoy: '
                  : nextUrgent.daysUntil === 1
                    ? 'Vence mañana: '
                    : `Vence en ${nextUrgent.daysUntil} días: `}
                {nextUrgent.title}
              </p>
              <p className="mt-0.5 text-[12px] text-rose-700">{nextUrgent.description}</p>
            </div>
          </div>
        )}

        {/* AEAT Quick Access */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <span className="text-[12px] font-semibold text-slate-700">Acceso directo AEAT</span>
          </div>
          <div className="divide-y divide-slate-50">
            <a
              href="https://sede.agenciatributaria.gob.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-[13px] font-medium text-slate-800">Sede Electrónica AEAT</p>
                <p className="text-[11px] text-slate-400">
                  Notificaciones, modelos y declaraciones
                </p>
              </div>
              <ExternalLink size={13} className="shrink-0 text-slate-400" />
            </a>
            <a
              href="https://sede.agenciatributaria.gob.es/Sede/verifactu.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-[13px] font-medium text-slate-800">VeriFactu (AEAT)</p>
                <p className="text-[11px] text-slate-400">
                  Portal oficial de facturación verificada
                </p>
              </div>
              <ExternalLink size={13} className="shrink-0 text-slate-400" />
            </a>
            <div className="flex items-center justify-between px-5 py-3 opacity-60">
              <div>
                <p className="text-[13px] font-medium text-slate-800">
                  SII — Suministro Inmediato de Información
                  <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                    Próximamente en Isaak
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Envío en tiempo real de facturas a la AEAT
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-slate-500" />
                <span className="text-[12px] font-semibold text-slate-700">
                  Próximos vencimientos
                </span>
              </div>
              <Link href="/calendario" className="text-[11px] text-[#2361d8] hover:underline">
                Google Calendar →
              </Link>
            </div>
          </div>

          {deadlines.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              No hay vencimientos fiscales próximos.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {deadlines.map((d) => (
                <li key={d.id} className="flex items-start gap-4 px-5 py-3">
                  <div className="mt-0.5 w-9 shrink-0 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {new Date(d.date).toLocaleDateString('es-ES', { month: 'short' })}
                    </div>
                    <div className="text-base font-bold leading-none text-slate-800">
                      {new Date(d.date).getDate()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-medium text-slate-800">{d.title}</span>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[d.category]}`}
                      >
                        {CATEGORY_LABEL[d.category]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">{fmtDate(d.date)}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] ${urgencyBadge(d.daysUntil)}`}>
                    {urgencyLabel(d.daysUntil)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alert history */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-slate-500" />
                <span className="text-[12px] font-semibold text-slate-700">
                  Alertas enviadas por Isaak
                </span>
              </div>
              <Link
                href="/settings?section=notificaciones"
                className="text-[11px] text-[#2361d8] hover:underline"
              >
                Configurar →
              </Link>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
              <BellOff size={24} className="text-slate-300" />
              <p className="text-sm text-slate-400">
                Aún no has recibido alertas fiscales de Isaak.
              </p>
              <p className="text-[12px] text-slate-400">
                Isaak te avisará por email cuando se acerquen los plazos fiscales (IVA, IRPF,
                Retenciones).
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <div
                    className={`mt-0.5 shrink-0 ${
                      a.status === 'sent' || a.status === 'read'
                        ? 'text-emerald-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {a.status === 'sent' || a.status === 'read' ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Clock size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-800">{a.title}</span>
                      <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {CHANNEL_ICON[a.channel]}
                        {a.channel}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{a.body}</p>
                    {a.dueDate && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Vencimiento: {fmtShort(a.dueDate)}
                        {typeof a.daysLeft === 'number' ? ` · D-${a.daysLeft}` : ''}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {a.sentAt ? fmtShort(a.sentAt) : fmtShort(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-slate-400">
          Isaak envía alertas por email con 15, 7, 3 y 1 día de antelación para IVA (Mod. 303), IRPF
          (Mod. 130), retenciones (Mod. 111/115), Impuesto Sociedades y resúmenes anuales.{' '}
          <Link href="/settings?section=notificaciones" className="text-[#2361d8] underline">
            Gestionar notificaciones
          </Link>
        </p>
      </div>
    </div>
  );
}
