'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, Bell, MessageSquare, ChevronRight, Loader2 } from 'lucide-react';

type Client = {
  tenantId: string;
  name: string;
  legalName: string | null;
  memberRole: string;
  subscription: {
    status: string;
    planName: string;
    planCode: string;
    trialEndsAt: string | null;
  } | null;
  lastActivity: { title: string | null; updatedAt: string } | null;
  pendingAlertsCount: number;
};

function fmtDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'trial'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export default function AdvisorDashboardClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advisor/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.ok ? d.clients : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2361d8]/10">
          <Building2 size={24} className="text-[#2361d8]" />
        </div>
        <p className="text-[16px] font-semibold text-[#011c67]">Sin clientes asignados</p>
        <p className="max-w-xs text-[13px] leading-relaxed text-slate-500">
          Aún no tienes empresas clientes vinculadas a tu perfil de asesor. Contacta con el
          administrador para que asigne los accesos.
        </p>
      </div>
    );
  }

  const totalAlerts = clients.reduce((s, c) => s + c.pendingAlertsCount, 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header stats */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <span>
            <strong className="text-[#011c67]">{clients.length}</strong> empresa
            {clients.length !== 1 ? 's' : ''} asignada{clients.length !== 1 ? 's' : ''}
          </span>
          {totalAlerts > 0 && (
            <span className="flex items-center gap-1 text-amber-700">
              <Bell size={13} />
              <strong>{totalAlerts}</strong> alerta{totalAlerts !== 1 ? 's' : ''} pendiente
              {totalAlerts !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Client cards */}
      <div className="flex-1 space-y-3 p-5">
        {clients.map((c) => (
          <div
            key={c.tenantId}
            className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#2361d8]/40 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2361d8]/8 text-[#2361d8]">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#011c67]">{c.name}</span>
                    {c.subscription ? (
                      <StatusBadge status={c.subscription.status} />
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-400">
                        sin plan
                      </span>
                    )}
                    {c.pendingAlertsCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <Bell size={10} />
                        {c.pendingAlertsCount}
                      </span>
                    )}
                  </div>
                  {c.legalName && c.legalName !== c.name && (
                    <div className="mt-0.5 text-xs text-slate-400">{c.legalName}</div>
                  )}
                  {c.subscription && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      Plan {c.subscription.planName}
                      {c.subscription.trialEndsAt &&
                        c.subscription.status === 'trial' &&
                        ` — trial hasta ${fmtDate(c.subscription.trialEndsAt)}`}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="mt-1 shrink-0 text-slate-300 group-hover:text-[#2361d8]"
              />
            </div>

            {/* Last Isaak activity */}
            {c.lastActivity && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <MessageSquare size={12} className="mt-0.5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <span className="truncate text-xs text-slate-600">
                    {c.lastActivity.title ?? 'Conversación sin título'}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-400">
                    {fmtDate(c.lastActivity.updatedAt)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <Link
                href={`/chat?tenant=${c.tenantId}`}
                className="rounded-lg border border-[#2361d8]/20 bg-[#2361d8]/5 px-3 py-1.5 text-xs font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
              >
                Abrir chat
              </Link>
              <Link
                href={`/informes?tenant=${c.tenantId}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Ver informe
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
