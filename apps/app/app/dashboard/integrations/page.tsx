'use client';

import { useEffect, useState } from 'react';

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

export default function IntegrationsPage() {
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [taxId, setTaxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [statusRes, logsRes, driveRes] = await Promise.all([
        fetch('/api/integrations/accounting/status'),
        fetch('/api/integrations/accounting/logs?limit=10'),
        fetch('/api/integrations/gdrive/status'),
      ]);
      const statusData = await statusRes.json().catch(() => null);
      const logsData = await logsRes.json().catch(() => null);
      const driveData = await driveRes.json().catch(() => null);

      if (!statusRes.ok) throw new Error(statusData?.error || 'No se pudo cargar la integración');
      setIntegration(statusData as IntegrationStatus);
      setLogs(Array.isArray(logsData?.items) ? (logsData.items as SyncLog[]) : []);
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

  const connectIntegration = async () => {
    const apiKey = window.prompt('Introduce API key de tu programa de contabilidad');
    if (!apiKey) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo conectar la integración contable');
      setMessage(data?.ok ? 'Integración contable conectada correctamente.' : 'Integración validada con errores.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo conectar la integración contable');
    } finally {
      setLoading(false);
    }
  };

  const disconnectIntegration = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/disconnect', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo desconectar la integración');
      setMessage('Integración contable desconectada.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo desconectar la integración contable');
    } finally {
      setLoading(false);
    }
  };

  const runSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/accounting/sync/run', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo lanzar sincronización');
      setMessage(
        `Sync lanzado. Procesados: ${data?.counts?.processed ?? 0}, fallidos: ${data?.counts?.failed ?? 0}`
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo lanzar sincronización');
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
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'No se pudo desconectar Google Drive');
      setMessage('Google Drive desconectado.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo desconectar Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const enrichTenant = async () => {
    if (!taxId.trim()) {
      setMessage('Introduce un NIF/CIF para eInforma.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/einforma/enrich-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxId: taxId.trim().toUpperCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo enriquecer empresa');
      setMessage(`Empresa enriquecida: ${data?.normalized?.name || 'OK'}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo enriquecer empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Integraciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Estado de integración contable vía API, sincronización manual y alta de empresa con eInforma.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Programa de contabilidad vía API</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
          <p>
            Estado: <span className="font-semibold">{integration?.status ?? 'desconocido'}</span>
          </p>
          <p>
            Último sync: <span className="font-semibold">{integration?.lastSyncAt || '—'}</span>
          </p>
          <p>
            Último error: <span className="font-semibold">{integration?.lastError || '—'}</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Plan actual: <span className="font-semibold">{integration?.plan || '—'}</span>. Esta integración es opcional y está disponible en Empresa y PRO.
        </p>
        {integration?.canConnect === false ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Tu plan actual incluye exportación AEAT en Excel, pero no incluye integración API.
            Para activarla, mejora a Empresa o PRO.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={connectIntegration}
              className="rounded-full bg-[#0b6cfb]/10 px-4 py-2 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
            >
              Conectar integración
            </button>
            <button
              onClick={disconnectIntegration}
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
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Google Drive (opcional)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Al conectar se crea automáticamente la carpeta <span className="font-semibold">verifactu_business</span> en el Drive del cliente para importación documental.
        </p>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            Estado: <span className="font-semibold">{drive?.status ?? 'desconocido'}</span>
          </p>
          <p>
            Cuenta: <span className="font-semibold">{drive?.email ?? '—'}</span>
          </p>
          <p>
            Carpeta: <span className="font-semibold">{drive?.folderName ?? '—'}</span>
          </p>
          <p>
            Último sync: <span className="font-semibold">{drive?.lastSyncAt ?? '—'}</span>
          </p>
        </div>
        {drive?.oauthReady === false ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Google Drive no está listo en este entorno. Faltan variables:
            {' '}
            <span className="font-semibold">{drive.missingEnv?.join(', ') || '—'}</span>
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
        <h2 className="text-base font-semibold text-slate-900">Añadir empresa con eInforma</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="NIF/CIF"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
          <button
            onClick={enrichTenant}
            className="rounded-lg bg-[#0b6cfb] px-4 text-sm font-semibold text-white hover:bg-[#095edb]"
          >
            Enriquecer
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Logs de sincronización</h2>
        <div className="mt-3 space-y-2">
          {logs.length === 0 ? <p className="text-sm text-slate-500">Sin logs recientes.</p> : null}
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold uppercase text-slate-500">{log.level}</p>
              <p className="mt-1">{log.message}</p>
              <p className="mt-1 text-slate-500">{log.created_at || log.createdAt || '—'}</p>
            </div>
          ))}
        </div>
      </section>

      {loading ? <p className="text-xs text-slate-500">Procesando...</p> : null}
      {message ? <p className="text-xs text-slate-700">{message}</p> : null}
    </div>
  );
}
