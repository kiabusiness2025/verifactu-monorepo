'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

type IntegrationStatus = {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connected: boolean;
  plan?: string | null;
  canConnect?: boolean;
  canUseAccountingApiIntegration?: boolean;
};

export default function IsaakForHoldedConnectPage() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (status?.connected) return 'Conectado';
    if (loading) return 'Comprobando conexion';
    return 'No conectado';
  }, [loading, status?.connected]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/accounting/status', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el estado de Holded');
      setStatus(data as IntegrationStatus);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar Holded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError('Necesitamos una API key valida para conectar Holded.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/accounting/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo conectar Holded');
      if (!data?.ok) {
        throw new Error(data?.probe?.error || data?.lastError || 'La API key de Holded no se pudo validar');
      }

      setMessage('Holded se ha conectado correctamente para este tenant.');
      setApiKey('');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo conectar Holded');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/integrations/isaak-for-holded"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conectar Holded</h1>
          <p className="mt-1 text-sm text-slate-600">
            Flujo interno para clientes de verifactu.business con control por plan y configuracion avanzada.
          </p>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Estado actual</div>
              <div className="mt-1 text-sm text-slate-600">{statusLabel}</div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${status?.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {status?.connected ? 'Activo' : 'Pendiente'}
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-semibold text-slate-900">{status?.plan || '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Ultimo sync</dt>
              <dd className="font-semibold text-slate-900">{status?.lastSyncAt || '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Ultimo error</dt>
              <dd className="max-w-[18rem] text-right font-semibold text-slate-900">{status?.lastError || '—'}</dd>
            </div>
          </dl>

          {status?.canConnect === false ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Esta integracion interna esta disponible en planes Empresa y PRO.
            </div>
          ) : null}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">API key de Holded</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Usa esta pantalla solo para la conexion interna del dashboard. Si vienes desde ChatGPT, el flujo correcto es el onboarding publico de Isaak for Holded.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-900">API key</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Pega aqui la API key de Holded"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                />
              </div>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || loading || status?.canConnect === false}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar conexion
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={saving || loading}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Actualizar estado
              </button>
            </div>
          </form>

          {message ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}
