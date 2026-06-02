// V1.1 - Hub minimo de integraciones.
//
// Bajo ISAAK_V1_LAUNCH exponemos solo Holded. Google Workspace,
// Microsoft 365, bancos y ERPs sectoriales quedan como backlog V2+
// para no mezclar el onboarding V1 con superficies aun no prioritarias.

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Plug,
  ShieldCheck,
} from 'lucide-react';

type HoldedStatus = {
  connected: boolean;
  status: string;
  keyMasked: string | null;
  connectedAt: string | null;
};

export default function IntegrationsV1Client() {
  const [holded, setHolded] = useState<HoldedStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHolded = useCallback(async () => {
    try {
      const res = await fetch('/api/holded/status', { credentials: 'include' });
      if (res.ok) setHolded((await res.json()) as HoldedStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHolded();
  }, [loadHolded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#2361d8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Integraciones</h1>
          <p className="text-sm text-slate-500">
            Conecta Holded para que Isaak trabaje con ventas, gastos, clientes y contabilidad real.
          </p>
        </div>
      </div>

      <IntegrationCard
        icon={<span className="text-base font-bold tracking-tight text-[#1a1f36]">H</span>}
        iconBg="bg-[#fff8e1]"
        title="Holded"
        subtitle="Tu ERP: facturas, clientes y contabilidad"
        connected={holded?.connected ?? false}
        configured
        status={
          holded?.connected
            ? `Vinculado · ${holded.keyMasked ?? 'API activa'}`
            : 'Pega tu API key y valida la conexion en menos de un minuto.'
        }
        primaryHref="/integration-holded"
        primaryLabel={holded?.connected ? 'Gestionar Holded' : 'Conectar Holded'}
        features={[
          'Lectura de facturas, clientes, productos y contabilidad',
          'Creacion de borradores para revisar antes de emitir',
          'API key cifrada con AES-256-GCM',
        ]}
      />

      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Proximas integraciones</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              En V1 mantenemos el producto centrado en Holded. Google Workspace, Microsoft 365,
              bancos y otros ERPs se reactivaran cuando el flujo core este validado.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ComingSoonCard title="Google Workspace" subtitle="Calendar, Gmail y Drive" />
              <ComingSoonCard title="Microsoft 365" subtitle="Outlook, Calendar y OneDrive" />
              <ComingSoonCard title="Bancos y ERPs" subtitle="Open banking, Revo, Hotelgest" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function IntegrationCard({
  icon,
  iconBg,
  title,
  subtitle,
  connected,
  configured,
  status,
  primaryHref,
  primaryLabel,
  features,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  connected: boolean;
  configured: boolean;
  status: string;
  primaryHref: string;
  primaryLabel: string;
  features: string[];
}) {
  const disabled = !configured;
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                connected
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {connected ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {connected ? 'Conectado' : 'No conectado'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">{status}</p>

      <ul className="mt-3 space-y-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[11px] text-slate-600">
            <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-1 items-end">
        {disabled ? (
          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <AlertCircle className="h-3.5 w-3.5" />
            Proximamente
          </span>
        ) : (
          <Link
            href={primaryHref}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              connected
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
            }`}
          >
            {primaryLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function ComingSoonCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        {title}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">{subtitle}</p>
    </div>
  );
}
