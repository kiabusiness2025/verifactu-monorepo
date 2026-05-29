// V1.1 — Hub minimal de integraciones (4 cards).
//
// Reemplaza al catálogo enorme (50+ apps) bajo el flag ISAAK_V1_LAUNCH.
// Expone solo lo que está soportado y validado en producción:
//   - Holded            → /integration-holded
//   - Google Workspace  → /api/isaak/google/auth (Calendar + Gmail + Drive)
//   - Microsoft 365     → /microsoft
//   - Calendario fiscal → derivado de Google/Microsoft (sync automático)
//
// El catálogo completo vive en IntegrationsClient y se reactivará en V2+
// quitando el flag.

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Cloud,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  Loader2,
  Mail,
  Plug,
  ShieldCheck,
} from 'lucide-react';

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  hasGmailScope: boolean;
  hasDriveScope: boolean;
  googleConfigured: boolean;
};

type MicrosoftStatus = {
  connected: boolean;
  email: string | null;
  displayName: string | null;
  hasCalendarScope: boolean;
  hasMailScope: boolean;
  hasOneDriveScope: boolean;
  microsoftConfigured: boolean;
};

type HoldedStatus = {
  connected: boolean;
  status: string;
  keyMasked: string | null;
  connectedAt: string | null;
};

export default function IntegrationsV1Client() {
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [microsoft, setMicrosoft] = useState<MicrosoftStatus | null>(null);
  const [holded, setHolded] = useState<HoldedStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [gRes, mRes, hRes] = await Promise.all([
        fetch('/api/isaak/google/status', { credentials: 'include' }),
        fetch('/api/isaak/microsoft/status', { credentials: 'include' }),
        fetch('/api/holded/status', { credentials: 'include' }),
      ]);
      if (gRes.ok) setGoogle((await gRes.json()) as GoogleStatus);
      if (mRes.ok) setMicrosoft((await mRes.json()) as MicrosoftStatus);
      if (hRes.ok) setHolded((await hRes.json()) as HoldedStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#2361d8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Integraciones</h1>
          <p className="text-sm text-slate-500">
            Conecta tu ERP, tus calendarios y tus emails para que Isaak trabaje con
            datos reales.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Holded */}
        <IntegrationCard
          icon={
            <span className="text-base font-bold tracking-tight text-[#1a1f36]">H</span>
          }
          iconBg="bg-[#fff8e1]"
          title="Holded"
          subtitle="Tu ERP — facturas, clientes, contabilidad"
          connected={holded?.connected ?? false}
          configured
          status={
            holded?.connected
              ? `Vinculado · ${holded.keyMasked ?? ''}`
              : 'Pega tu API key en 30 segundos'
          }
          primaryHref="/integration-holded"
          primaryLabel={holded?.connected ? 'Gestionar' : 'Conectar Holded'}
          features={[
            'Lectura: facturas, clientes, productos, contabilidad',
            'Crear borradores (apruebas tú antes de emitir)',
            'API key cifrada con AES-256-GCM',
          ]}
        />

        {/* Google Workspace */}
        <IntegrationCard
          icon={<GoogleLogo />}
          iconBg="bg-white border border-slate-200"
          title="Google Workspace"
          subtitle="Calendar · Gmail · Drive"
          connected={google?.connected ?? false}
          configured={google?.googleConfigured ?? false}
          status={
            google?.connected
              ? `Vinculado · ${google.email ?? ''}`
              : 'Sincroniza vencimientos AEAT y archiva facturas en Drive'
          }
          primaryHref={
            google?.connected ? '/api/isaak/google/auth' : '/api/isaak/google/auth'
          }
          primaryLabel={
            google?.connected ? 'Ampliar permisos' : 'Conectar Google'
          }
          primaryExternal
          features={[
            { icon: Calendar, text: 'Calendar: vencimientos AEAT automáticos' },
            { icon: Mail, text: 'Gmail: detecta facturas de proveedores' },
            { icon: HardDrive, text: 'Drive: archivado en carpeta "Isaak — Facturas"' },
          ]}
        />

        {/* Microsoft 365 */}
        <IntegrationCard
          icon={<Cloud className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          title="Microsoft 365"
          subtitle="Outlook · Calendar · OneDrive"
          connected={microsoft?.connected ?? false}
          configured={microsoft?.microsoftConfigured ?? false}
          status={
            microsoft?.connected
              ? `Vinculado · ${microsoft.displayName ?? microsoft.email ?? ''}`
              : 'Misma funcionalidad que Google, en el ecosistema Microsoft'
          }
          primaryHref="/microsoft"
          primaryLabel={microsoft?.connected ? 'Gestionar' : 'Conectar Microsoft'}
          features={[
            { icon: Calendar, text: 'Outlook Calendar: vencimientos AEAT' },
            { icon: Mail, text: 'Outlook Mail: detecta facturas' },
            { icon: HardDrive, text: 'OneDrive: archivado de facturas PDF' },
          ]}
        />

        {/* Calendario fiscal */}
        <IntegrationCard
          icon={<Calendar className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          title="Calendario fiscal"
          subtitle="Vencimientos AEAT en tu calendario"
          connected={
            (google?.connected ?? false) || (microsoft?.connected ?? false)
          }
          configured
          status={
            google?.connected || microsoft?.connected
              ? 'Sincronización disponible — entra en la integración para crear eventos.'
              : 'Conecta Google o Microsoft primero para sincronizar plazos.'
          }
          primaryHref={
            google?.connected
              ? '/integrations'
              : microsoft?.connected
                ? '/microsoft'
                : '/integrations'
          }
          primaryLabel={
            google?.connected || microsoft?.connected
              ? 'Sincronizar'
              : 'Conectar calendario'
          }
          features={[
            { icon: FileSpreadsheet, text: 'Modelos 303, 130, 111, 115, 349, 347' },
            { icon: Calendar, text: 'Recordatorios D-15 / D-7 / D-3 / D-1' },
            { icon: ShieldCheck, text: 'Eventos privados, solo en tu calendario' },
          ]}
        />
      </div>

      {/* Footer — qué más viene */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Próximas integraciones
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Estamos integrando bancos (Enable Banking), CRMs, plataformas de cobro
              y ERPs sectoriales (Revo, Hotelgest…). Si quieres priorizar alguna,{' '}
              <Link
                href="/ayuda"
                className="font-medium text-[#2361d8] hover:underline"
              >
                escríbenos
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type FeatureLine = { icon: React.ComponentType<{ className?: string }>; text: string };

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
  primaryExternal,
  features,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  connected: boolean;
  configured: boolean;
  status: string;
  primaryHref: string;
  primaryLabel: string;
  primaryExternal?: boolean;
  features: (string | FeatureLine)[];
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
        {features.map((f, i) => {
          if (typeof f === 'string') {
            return (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />
                {f}
              </li>
            );
          }
          const Icon = f.icon;
          return (
            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
              <Icon className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
              {f.text}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-1 items-end">
        {disabled ? (
          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <AlertCircle className="h-3.5 w-3.5" />
            Próximamente
          </span>
        ) : primaryExternal ? (
          <a
            href={primaryHref}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              connected
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
            }`}
          >
            {primaryLabel}
            {connected ? (
              <ExternalLink className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
          </a>
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

// Google "G" logo (inline SVG, sin dependencia externa).
function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
