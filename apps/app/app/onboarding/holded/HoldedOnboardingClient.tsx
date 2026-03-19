'use client';

import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import Image from 'next/image';
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
  degraded?: boolean;
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
    <div className="min-h-screen bg-white px-4 py-10 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/holded/holded-diamond-red.png"
              alt="Holded"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Isaak for Holded</div>
              <Image
                src="/brand/holded/holded-logotype-red-light.svg"
                alt="Holded"
                width={112}
                height={22}
                className="mt-1 h-[22px] w-auto"
              />
            </div>
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Conecta tu cuenta de Holded
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-700 sm:text-base">
            Usa tu API key de Holded para activar Isaak y trabajar con tus datos reales desde ChatGPT. Esta version es externa y gratuita, pensada para usuarios que empiezan desde Isaak for Holded.
          </p>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="text-sm font-semibold text-black">Workspace preparado</div>
            <div className="mt-2 text-sm text-neutral-700">
              Espacio actual: <span className="font-semibold text-black">{tenantName}</span>
            </div>
            <div className="mt-2 text-sm text-neutral-700">
              Estado actual: <span className="font-semibold text-black">{statusLabel}</span>
            </div>
            {status?.degraded ? (
              <div className="mt-3 text-sm text-amber-700">
                No hemos podido leer el estado inicial, pero puedes continuar igualmente con la conexion.
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black">API key de Holded</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Pega aqui tu API key de Holded"
                  className="h-12 w-full rounded-2xl border border-neutral-300 bg-white pl-11 pr-4 text-sm text-black outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                />
              </div>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Conectar Holded
              </button>

              <Link
                href="https://www.holded.com/es/help/mi-cuenta/api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Donde encontrar mi API key
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
