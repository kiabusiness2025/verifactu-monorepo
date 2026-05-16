'use client';

import { adminDelete, adminPost } from '@/lib/adminApi';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  connectionId: string;
  tenantId: string;
  status: string;
  hasApiKey: boolean;
};

export function ConnectorActions({ connectionId, tenantId, status, hasApiKey }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    reason?: string | null;
    testedAt?: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (
      !window.confirm(
        'Vas a revocar esta conexión. La acción borra la API key cifrada y es irreversible. ¿Continuar?'
      )
    )
      return;
    setBusy('revoke');
    setError(null);
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/connectors/${connectionId}/revoke`, {
        reason: 'admin_panel_revoke',
      });
      setNotice('Conexión revocada correctamente.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al revocar');
    } finally {
      setBusy(null);
    }
  }

  async function handleReactivate() {
    if (
      !window.confirm(
        'Vas a reactivar esta conexión (cambiar estado de revocado a desconectado). El tenant deberá reconectarse manualmente. ¿Continuar?'
      )
    )
      return;
    setBusy('reactivate');
    setError(null);
    try {
      await adminPost(`/api/admin/connectors/${connectionId}/reactivate`, {});
      setNotice('Conexión reactivada. Estado: desconectado.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reactivar');
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        'Vas a ELIMINAR esta conexión de forma permanente. Se borrarán también todos sus tokens y logs de auditoría. Esta acción es irreversible. ¿Confirmas?'
      )
    )
      return;
    setBusy('delete');
    setError(null);
    try {
      await adminDelete(`/api/admin/connectors/${connectionId}`);
      router.push('/connectors');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
      setBusy(null);
    }
  }

  async function handlePing() {
    setBusy('ping');
    setPingResult(null);
    setError(null);
    try {
      const result = await adminPost<{
        ok: boolean;
        latencyMs?: number;
        reason?: string | null;
        testedAt?: string;
      }>(`/api/admin/connectors/${connectionId}/ping`, {});
      setPingResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al hacer ping');
    } finally {
      setBusy(null);
    }
  }

  const canRevoke = status === 'connected' || status === 'error';
  const canReactivate = status === 'revoked_api';
  const canPing = hasApiKey && (status === 'connected' || status === 'error');
  const canDelete = status === 'disconnected' || status === 'revoked_api';

  return (
    <div className="space-y-3">
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canPing && (
          <button
            type="button"
            onClick={handlePing}
            disabled={busy !== null}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'ping' ? 'Probando…' : 'Test Ping'}
          </button>
        )}
        {canRevoke && (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={busy !== null}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {busy === 'revoke' ? 'Revocando…' : 'Revocar conexión'}
          </button>
        )}
        {canReactivate && (
          <button
            type="button"
            onClick={handleReactivate}
            disabled={busy !== null}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {busy === 'reactivate' ? 'Reactivando…' : 'Reactivar conexión'}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy !== null}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
          >
            {busy === 'delete' ? 'Eliminando…' : 'Eliminar conexión'}
          </button>
        )}
      </div>

      {pingResult && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${pingResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
        >
          <span className="font-semibold">
            {pingResult.ok ? '✓ API key válida' : '✗ API key inválida'}
          </span>
          {pingResult.latencyMs != null && (
            <span className="ml-2 text-xs opacity-70">{pingResult.latencyMs} ms</span>
          )}
          {pingResult.reason && <p className="mt-1 text-xs opacity-80">{pingResult.reason}</p>}
          {pingResult.testedAt && (
            <p className="mt-0.5 text-[10px] opacity-50">
              Probado a las {new Date(pingResult.testedAt).toLocaleTimeString('es-ES')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
