'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmActionModal } from './components/ConfirmActionModal';

type IntegrationStatus = {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connected: boolean;
  plan?: string | null;
  canConnect?: boolean;
};

type DriveStatus = {
  provider: string;
  status: string;
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  folderName: string | null;
  folderId: string | null;
  folderWebViewLink: string | null;
  email: string | null;
  oauthReady?: boolean;
  missingEnv?: string[];
};

type SyncLog = {
  id: string;
  level: string;
  message: string;
  created_at?: string;
  createdAt?: string;
};

type LogsSummaryPayload = {
  mode: 'summary';
  tenantId: string;
  summaryLimit: number;
  summary: {
    sync: {
      total: number;
      warnings: number;
      errors: number;
    };
    conflicts: {
      quotes: number;
    };
    claims: {
      total: number;
      open: number;
    };
    accessRequests: {
      total: number;
      pending: number;
    };
    governance: {
      flags: {
        ownershipStatus: string | null;
        managedByThirdParty: boolean;
        clientAdminGap: boolean;
        highGovernanceRisk: boolean;
        underClaimReview: boolean;
      } | null;
      blockedActions: Array<{
        action: string;
        reason: string | null;
      }>;
    };
  };
  incidents: Array<{
    source: string;
    severity: string;
    message: string;
    createdAt: string;
    outboxId: string | null;
    requestId: string | null;
  }>;
  requestId: string;
};

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsSummary, setLogsSummary] = useState<LogsSummaryPayload | null>(null);
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const connectedToHolded = integration?.connected === true;
  const fiscalProfilePending =
    connectedToHolded &&
    (!logsSummary ||
      logsSummary.summary.governance.blockedActions.length > 0 ||
      logsSummary.summary.sync.errors > 0 ||
      logsSummary.summary.accessRequests.pending > 0);
  const fiscalProfileBadge = !connectedToHolded
    ? 'Sin conexion activa'
    : fiscalProfilePending
      ? 'Perfil fiscal pendiente'
      : 'Perfil fiscal completo';
  const fiscalProfileHelpText = !connectedToHolded
    ? 'Conecta Holded para revisar y completar tu perfil fiscal.'
    : fiscalProfilePending
      ? 'Hay revisiones pendientes. Completa tu perfil fiscal para reducir bloqueos y continuar con normalidad.'
      : 'Perfil fiscal al dia. Puedes operar con normalidad desde el panel del conector Holded.';

  useEffect(() => {
    if (searchParams?.get('holded_admin') === 'forbidden') {
      setMessage(
        'Acceso restringido al panel admin del Conector Holded. Inicia sesion con la cuenta autorizada de soporte o con un email incluido en ADMIN_EMAILS.'
      );
    }
  }, [searchParams]);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [statusRes, logsRes, logsSummaryRes, driveRes] = await Promise.all([
        fetch('/api/integrations/accounting/status'),
        fetch('/api/integrations/accounting/logs?limit=10'),
        fetch('/api/integrations/accounting/logs?mode=summary&summaryLimit=120'),
        fetch('/api/integrations/gdrive/status'),
      ]);
      const statusData = await statusRes.json().catch(() => null);
      const logsData = await logsRes.json().catch(() => null);
      const logsSummaryData = await logsSummaryRes.json().catch(() => null);
      const driveData = await driveRes.json().catch(() => null);

      if (!statusRes.ok) throw new Error(statusData?.error || 'No se pudo cargar la integracion');
      setIntegration(statusData as IntegrationStatus);
      setLogs(Array.isArray(logsData?.items) ? (logsData.items as SyncLog[]) : []);
      setLogsSummary(
        logsSummaryRes.ok && logsSummaryData?.mode === 'summary'
          ? (logsSummaryData as LogsSummaryPayload)
          : null
      );
      if (driveRes.ok && driveData) setDrive(driveData as DriveStatus);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo cargar integraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const disconnectIntegration = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-holded-entry-channel': 'dashboard',
        },
        body: JSON.stringify({ reauthConfirmed: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo desconectar la integracion');
      setMessage('Integracion contable desconectada.');

      const reconnectUrl =
        typeof data?.reconnectPolicy?.reconnectUrl === 'string'
          ? data.reconnectPolicy.reconnectUrl.trim()
          : '';
      if (reconnectUrl) {
        window.location.assign(reconnectUrl);
        return;
      }

      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo desconectar la integracion');
    } finally {
      setLoading(false);
      setIsDisconnectModalOpen(false);
    }
  };

  const runSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/sync/run', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo lanzar sincronizacion');
      setMessage(
        `Sync lanzado. Procesados: ${data?.counts?.processed ?? 0}, fallidos: ${data?.counts?.failed ?? 0}`
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo lanzar sincronizacion');
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleDrive = () => {
    window.location.href = '/api/integrations/gdrive/auth';
  };

  const disconnectGoogleDrive = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/gdrive/disconnect', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || 'No se pudo desconectar Google Drive');
      setMessage('Google Drive desconectado.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo desconectar Google Drive');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Integraciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Estado de integracion contable via API y sincronizacion manual.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Programa de contabilidad via API</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
          <p>
            Estado: <span className="font-semibold">{integration?.status ?? 'desconocido'}</span>
          </p>
          <p>
            Ultimo sync: <span className="font-semibold">{integration?.lastSyncAt || '-'}</span>
          </p>
          <p>
            Ultimo error: <span className="font-semibold">{integration?.lastError || '-'}</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Plan actual: <span className="font-semibold">{integration?.plan || '-'}</span>. Esta
          integracion es opcional y esta disponible en Empresa y PRO.
        </p>
        {integration?.canConnect === false ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Tu plan actual incluye exportacion AEAT en Excel, pero no incluye integracion API. Para
            activarla, mejora a Empresa o PRO.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/integrations/holded/connect"
              className="rounded-full bg-[#0b6cfb]/10 px-4 py-2 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
            >
              Conectar integracion
            </Link>
            <button
              onClick={() => setIsDisconnectModalOpen(true)}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Desconectar
            </button>
            <button
              onClick={runSync}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ejecutar sync
            </button>
            <Link
              href="/dashboard/integrations/holded"
              className="rounded-full border border-[#0b6cfb]/30 bg-white px-4 py-2 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/5"
            >
              Abrir panel del conector
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_55%,#ffffff_100%)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Panel del conector Holded</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Accede a una capa guiada para traducir Holded a lenguaje de negocio, consultar
              facturas, clientes y cuentas contables, y preparar borradores con el conector.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  !connectedToHolded
                    ? 'bg-slate-100 text-slate-700'
                    : fiscalProfilePending
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {fiscalProfileBadge}
              </span>
              {connectedToHolded && fiscalProfilePending ? (
                <Link
                  href="/dashboard/integrations/holded/connect?focus=profile"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Completar perfil fiscal
                </Link>
              ) : null}
            </div>
            <p className="mt-2 max-w-2xl text-xs text-slate-600">{fiscalProfileHelpText}</p>
          </div>
          <Link
            href="/dashboard/integrations/holded"
            className="inline-flex items-center justify-center rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb]"
          >
            Entrar al modulo
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Google Drive (opcional)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Al conectar se crea automaticamente la carpeta{' '}
          <span className="font-semibold">verifactu_business</span> en el Drive del cliente para
          importacion documental.
        </p>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            Estado: <span className="font-semibold">{drive?.status ?? 'desconocido'}</span>
          </p>
          <p>
            Cuenta: <span className="font-semibold">{drive?.email ?? '-'}</span>
          </p>
          <p>
            Carpeta: <span className="font-semibold">{drive?.folderName ?? '-'}</span>
          </p>
          <p>
            Ultimo sync: <span className="font-semibold">{drive?.lastSyncAt ?? '-'}</span>
          </p>
        </div>
        {drive?.oauthReady === false ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Google Drive no esta listo en este entorno. Faltan variables:{' '}
            <span className="font-semibold">{drive.missingEnv?.join(', ') || '-'}</span>
          </div>
        ) : null}
        {drive?.lastError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            {drive.lastError}
          </div>
        ) : null}
        {drive?.folderWebViewLink ? (
          <a
            href={drive.folderWebViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-xs font-semibold text-[#0b6cfb] hover:underline"
          >
            Abrir carpeta en Google Drive
          </a>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={connectGoogleDrive}
            disabled={loading || drive?.oauthReady === false}
            className="rounded-full bg-[#0b6cfb]/10 px-4 py-2 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
          >
            Conectar Google Drive
          </button>
          <button
            onClick={disconnectGoogleDrive}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Desconectar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Logs de sincronizacion</h2>
        <div className="mt-3 space-y-2">
          {logs.length === 0 ? <p className="text-sm text-slate-500">Sin logs recientes.</p> : null}
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
            >
              <p className="font-semibold uppercase text-slate-500">{log.level}</p>
              <p className="mt-1">{log.message}</p>
              <p className="mt-1 text-slate-500">{log.created_at || log.createdAt || '-'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Resumen operativo por tenant/requestId
        </h2>
        {!logsSummary ? (
          <p className="mt-3 text-sm text-slate-500">Resumen no disponible en este momento.</p>
        ) : (
          <>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <p>
                Sync warnings/errors:{' '}
                <span className="font-semibold">
                  {logsSummary.summary.sync.warnings}/{logsSummary.summary.sync.errors}
                </span>
              </p>
              <p>
                Conflictos quotes:{' '}
                <span className="font-semibold">{logsSummary.summary.conflicts.quotes}</span>
              </p>
              <p>
                Claims abiertas:{' '}
                <span className="font-semibold">{logsSummary.summary.claims.open}</span>
              </p>
              <p>
                Access requests pendientes:{' '}
                <span className="font-semibold">{logsSummary.summary.accessRequests.pending}</span>
              </p>
              <p>
                Tenant: <span className="font-semibold">{logsSummary.tenantId}</span>
              </p>
              <p>
                Muestra de logs: <span className="font-semibold">{logsSummary.summaryLimit}</span>
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-600">Acciones bloqueadas</p>
              {logsSummary.summary.governance.blockedActions.length === 0 ? (
                <p className="mt-1 text-slate-500">Ninguna accion bloqueada.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {logsSummary.summary.governance.blockedActions.map((item) => (
                    <li key={item.action}>
                      <span className="font-semibold">{item.action}</span>
                      {item.reason ? `: ${item.reason}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Incidentes recientes
              </p>
              {logsSummary.incidents.length === 0 ? (
                <p className="text-sm text-slate-500">Sin incidentes recientes.</p>
              ) : (
                logsSummary.incidents.slice(0, 6).map((incident, index) => (
                  <div
                    key={`${incident.message}-${incident.createdAt}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"
                  >
                    <p className="font-semibold uppercase text-slate-500">{incident.severity}</p>
                    <p className="mt-1">{incident.message}</p>
                    <p className="mt-1 text-slate-500">{incident.createdAt}</p>
                    <p className="mt-1 text-slate-500">requestId: {incident.requestId || '-'}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>

      {loading ? <p className="text-xs text-slate-500">Procesando...</p> : null}
      {message ? <p className="text-xs text-slate-700">{message}</p> : null}

      <ConfirmActionModal
        isOpen={isDisconnectModalOpen}
        title="Desconectar integracion contable"
        description="Esta accion detendra el acceso tecnico hasta que vuelvas a conectar la cuenta desde el dashboard."
        confirmLabel="Desconectar"
        tone="danger"
        isWorking={loading}
        onClose={() => setIsDisconnectModalOpen(false)}
        onConfirm={disconnectIntegration}
      />
    </div>
  );
}
