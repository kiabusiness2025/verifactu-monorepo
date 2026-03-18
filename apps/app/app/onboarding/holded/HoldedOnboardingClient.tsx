'use client';

import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type IntegrationStatus = {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connected: boolean;
  plan?: string | null;
  canConnect?: boolean;
  canUseAccountingApiIntegration?: boolean;
  connectionMode?: 'verifactu_first' | 'holded_first';
};

type Props = {
  nextUrl: string;
  tenantName: string;
};

export default function HoldedOnboardingClient({ nextUrl, tenantName }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (status?.connected) return 'Holded ya esta conectado';
    if (loading) return 'Comprobando conexion';
    return 'Pendiente de conexion';
  }, [loading, status?.connected]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/integrations/accounting/status?channel=chatgpt', {
          cache: 'no-store',
          headers: { 'x-isaak-entry-channel': 'chatgpt' },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'No se pudo comprobar la conexion con Holded');
        if (cancelled) return;
        setStatus(data as IntegrationStatus);
        if (data?.connected && nextUrl) {
          window.location.replace(nextUrl);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo comprobar la conexion con Holded');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [nextUrl]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError('Necesitamos la API key de Holded para activar Isaak for Holded.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/accounting/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo conectar Holded');
      if (!data?.ok) {
        throw new Error(data?.probe?.error || data?.lastError || 'La API key de Holded no se pudo validar');
      }

      setMessage('Holded conectado correctamente. Estamos volviendo a Isaak para terminar la autorizacion.');
      window.location.replace(nextUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo conectar Holded');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_52%,#ffffff_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0b6cfb]/15 bg-[#0b6cfb]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b6cfb]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Isaak for Holded
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Conecta Holded para que Isaak pueda trabajar con tus datos reales
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Ya hemos identificado tu espacio en Isaak. El siguiente paso es guardar la API key de Holded de forma segura en Verifactu para que el asistente pueda leer facturas, contactos, cuentas y preparar borradores desde ChatGPT.
          </p>

          <div className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 sm:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-sm font-semibold text-slate-900">Workspace preparado</div>
              <div className="mt-2 text-sm text-slate-600">
                Empresa activa: <span className="font-semibold text-slate-900">{tenantName}</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Estado actual: <span className="font-semibold text-slate-900">{statusLabel}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Que necesitas ahora</div>
              <ul className="mt-3 space-y-2">
                <li>Genera o copia tu API key desde Holded.</li>
                <li>Pegala aqui una sola vez.</li>
                <li>Isaak la valida y vuelve automaticamente al flujo de ChatGPT.</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">API key de Holded</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Pega aqui tu API key de Holded"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                />
              </div>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Conectar Holded
              </button>

              <Link
                href="/dashboard/integrations/isaak-for-holded"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Abrir configuracion avanzada
              </Link>
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
        </div>
      </div>
    </div>
  );
}
