'use client';

import { adminGet, adminPost } from '@/lib/adminApi';
import { useEffect, useState } from 'react';

type Status = {
  incomplete: number;
  pending_reminder: number;
  last_sent: string | null;
  total_reminders_sent: number;
  interval_days: number;
};

type RunResult = {
  ok: boolean;
  tenants_notified: number;
  skipped: number;
  total_incomplete: number;
};

function fmt(iso: string | null) {
  if (!iso) return 'Nunca';
  try {
    return new Date(iso).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function RemindersWidget() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGet<Status>('/api/admin/profile-reminders/status')
      .then(setStatus)
      .catch(() => null);
  }, []);

  async function handleRunNow() {
    if (
      !confirm(
        `Se enviarán recordatorios a los ${status?.pending_reminder ?? '?'} tenants con perfil incompleto que no han recibido uno en los últimos ${status?.interval_days ?? 3} días. ¿Continuar?`
      )
    )
      return;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await adminPost<RunResult>('/api/cron/profile-reminders', {});
      setResult(res);
      // Refresh status
      const newStatus = await adminGet<Status>('/api/admin/profile-reminders/status').catch(
        () => null
      );
      if (newStatus) setStatus(newStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold text-slate-500">Perfiles incompletos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {status?.incomplete ?? '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            tenants Holded sin email, teléfono, CNAE o representante
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold text-amber-700">Pendientes de recordatorio</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">
            {status?.pending_reminder ?? '—'}
          </p>
          <p className="mt-0.5 text-xs text-amber-600">
            no han recibido recordatorio en {status?.interval_days ?? 3} días
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
          <p className="text-xs font-semibold text-slate-500">Último envío automático</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {fmt(status?.last_sent ?? null)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {status?.total_reminders_sent ?? 0} recordatorios enviados en total
          </p>
        </div>
      </div>

      {/* Info & manual trigger */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Recordatorio automático</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Se ejecuta automáticamente de lunes a viernes a las 9:00h (Madrid). Respeta una
              cadencia de {status?.interval_days ?? 3} días entre recordatorios por tenant.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running || status?.pending_reminder === 0}
            className="rounded-xl bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e56c4] disabled:opacity-40"
          >
            {running ? 'Enviando…' : 'Enviar ahora'}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        {result && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">Recordatorios enviados</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              {result.tenants_notified} tenant{result.tenants_notified !== 1 ? 's' : ''} notificado
              {result.tenants_notified !== 1 ? 's' : ''} · {result.skipped} omitido
              {result.skipped !== 1 ? 's' : ''} (sin usuarios) · {result.total_incomplete} con
              perfil incompleto en total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
