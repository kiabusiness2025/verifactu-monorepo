'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Cloud,
  ExternalLink,
  HardDrive,
  Loader2,
  Mail,
  RefreshCcw,
  Unplug,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type MicrosoftStatus = {
  connected: boolean;
  email: string | null;
  displayName: string | null;
  connectedAt: string | null;
  hasCalendarScope: boolean;
  hasMailScope: boolean;
  hasSendScope: boolean;
  hasOneDriveScope: boolean;
  microsoftConfigured: boolean;
  upcoming: Array<{ id: string; title: string; modelo: string; date: string; daysUntil: number }>;
};

type SyncResult = { created: number; skipped: number; errors: number };

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function MicrosoftPage() {
  const [status, setStatus] = useState<MicrosoftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/microsoft/status');
      if (res.ok) setStatus((await res.json()) as MicrosoftStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleConnect = () => {
    window.location.href = '/api/isaak/microsoft/auth';
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar Microsoft 365? Se eliminarán los tokens almacenados.')) return;
    setDisconnecting(true);
    await fetch('/api/isaak/microsoft/disconnect', { method: 'DELETE' }).catch(() => null);
    await loadStatus();
    setDisconnecting(false);
  };

  const handleSync = async (year: number) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/isaak/microsoft/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });
      if (res.ok) setSyncResult((await res.json()) as SyncResult);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-slate-500">No se pudo cargar el estado de Microsoft 365.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Microsoft 365</h1>
          <p className="text-sm text-slate-500">
            Outlook Calendar, Outlook Mail y OneDrive integrados en Isaak.
          </p>
        </div>
      </div>

      {!status.microsoftConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mb-1 inline h-4 w-4" /> Microsoft 365 no está configurado en este
          entorno. Añade las variables <code>MICROSOFT_CLIENT_ID</code> y{' '}
          <code>MICROSOFT_CLIENT_SECRET</code> en Vercel.
        </div>
      )}

      {/* Connection card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {status.connected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {status.displayName ?? status.email ?? 'Cuenta conectada'}
                </p>
                {status.email && status.displayName && (
                  <p className="text-xs text-slate-500">{status.email}</p>
                )}
                {status.connectedAt && (
                  <p className="mt-1 text-xs text-slate-400">
                    Conectado el {new Date(status.connectedAt).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge ok={status.hasCalendarScope} label="Calendar" />
              <Badge ok={status.hasMailScope} label="Mail" />
              <Badge ok={status.hasSendScope} label="Mail.Send" />
              <Badge ok={status.hasOneDriveScope} label="OneDrive" />
            </div>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Desconectar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Conecta tu cuenta de Microsoft 365 para que Isaak pueda acceder a tu Outlook Calendar,
              Outlook Mail y OneDrive directamente desde el chat.
            </p>
            <button
              onClick={handleConnect}
              disabled={!status.microsoftConfigured}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Cloud className="h-4 w-4" />
              Conectar Microsoft 365
            </button>
          </div>
        )}
      </div>

      {/* Capabilities */}
      {status.connected && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              Icon: Calendar,
              title: 'Outlook Calendar',
              desc: 'Lista, crea y gestiona eventos directamente desde el chat.',
              ok: status.hasCalendarScope,
            },
            {
              Icon: Mail,
              title: 'Outlook Mail',
              desc: 'Detecta facturas de proveedores y archiva emails procesados.',
              ok: status.hasMailScope,
            },
            {
              Icon: HardDrive,
              title: 'OneDrive',
              desc: 'Guarda facturas PDF en la carpeta "Isaak — Facturas".',
              ok: status.hasOneDriveScope,
            },
          ].map(({ Icon, title, desc, ok }) => (
            <div
              key={title}
              className={`rounded-xl border p-4 ${ok ? 'border-blue-100 bg-blue-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${ok ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-900">{title}</span>
                {ok && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-blue-500" />}
              </div>
              <p className="mt-1 text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sync section */}
      {status.connected && status.hasCalendarScope && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Sincronizar calendario fiscal</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Crea eventos en Outlook Calendar con los vencimientos fiscales del año.
              </p>
            </div>
            <button
              onClick={() => handleSync(new Date().getFullYear())}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Sincronizar {new Date().getFullYear()}
            </button>
          </div>

          {syncResult && (
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Creados: <strong>{syncResult.created}</strong> · Ya existían:{' '}
              <strong>{syncResult.skipped}</strong> · Errores: <strong>{syncResult.errors}</strong>
            </div>
          )}

          {status.upcoming.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Próximos vencimientos (90 días)
              </p>
              <div className="space-y-1">
                {status.upcoming.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-12 rounded px-1.5 py-0.5 text-center font-semibold ${
                        d.daysUntil <= 7
                          ? 'bg-red-100 text-red-700'
                          : d.daysUntil <= 14
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {d.daysUntil}d
                    </span>
                    <span className="text-slate-700">{d.title}</span>
                    <span className="ml-auto text-slate-400">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Docs link */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          Isaak usa Microsoft Graph API con OAuth delegado — solo accede a tu cuenta personal, nunca
          a otros usuarios de tu organización.{' '}
          <a
            href="https://learn.microsoft.com/en-us/graph/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
          >
            Microsoft Graph docs <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
