'use client';

import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Loader2, Sparkles } from 'lucide-react';
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
  onboardingToken: string | null;
};

const helpSteps = [
  'Entra en tu cuenta de Holded con tu usuario habitual.',
  'Abre tu perfil o el area de ajustes de la cuenta.',
  'Busca la seccion de API o desarrolladores dentro de tu cuenta.',
  'Crea una nueva API key o copia la que ya tengas activa.',
  'Vuelve a esta pantalla y pegala para conectar Isaak.',
];

const savingMessages = [
  'Isaak esta verificando tu acceso a facturas y borradores.',
  'Estamos preparando lectura de contactos y cuentas contables.',
  'Isaak dejara lista tu conexion para operar desde ChatGPT.',
  'En cuanto termine, podras pedir resumenes, pendientes y senales clave.',
];

export default function HoldedOnboardingClient({ nextUrl, tenantName, onboardingToken }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMessageIndex, setSavingMessageIndex] = useState(0);

  const statusLabel = useMemo(() => {
    if (status?.connected) return 'Holded ya esta conectado';
    if (loading) return 'Comprobando conexion';
    return 'Pendiente de conexion';
  }, [loading, status?.connected]);

  useEffect(() => {
    if (!saving) {
      setSavingMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setSavingMessageIndex((current) => (current + 1) % savingMessages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [saving]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/integrations/accounting/status?channel=chatgpt', {
          cache: 'no-store',
          headers: {
            'x-isaak-entry-channel': 'chatgpt',
            ...(onboardingToken ? { 'x-isaak-onboarding-token': onboardingToken } : {}),
          },
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
  }, [nextUrl, onboardingToken]);

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
          ...(onboardingToken ? { 'x-isaak-onboarding-token': onboardingToken } : {}),
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || data?.error || 'No se pudo conectar Holded');
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
          <div className="flex justify-center">
            <Image
              src="/brand/holded/holded-diamond-logo.png"
              alt="Holded"
              width={120}
              height={120}
              className="h-24 w-24 sm:h-28 sm:w-28"
              priority
            />
          </div>

          <div className="mt-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Isaak for Holded</div>
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

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold text-black">Como encontrar tu API key en Holded</div>
            <ol className="mt-4 space-y-3 text-sm text-neutral-700">
              {helpSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Usa una API key de la misma cuenta de Holded con la que quieres trabajar en Isaak. No dependemos del correo de ChatGPT para decidir la cuenta: la cuenta la determina la API key que pegues aqui.
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0b6cfb]/10 text-[#0b6cfb]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-black">¿Quieres la experiencia completa de Isaak?</div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Activa verifactu.business y prueba gratis durante 30 días la versión completa: panel visual, histórico, trazabilidad, reglas fiscales y gestión avanzada.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="https://verifactu.business"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Probar Verifactu gratis 30 días
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="https://verifactu.business/que-es-isaak"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Ver experiencia completa
                  </Link>
                </div>
              </div>
            </div>
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
                disabled={saving || !apiKey.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Conectar Holded
              </button>
            </div>
          </form>

          {saving ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_48%,#fff4f5_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-black">Conectando tu cuenta de Holded</div>
                  <div className="mt-1 text-sm text-neutral-600">No cierres esta ventana. Estamos validando la API key y preparando Isaak.</div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-[#ff5460]" />
              </div>

              <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Mientras esperas</div>
                <p className="mt-3 min-h-[48px] text-sm leading-6 text-neutral-800 transition-all duration-300">
                  {savingMessages[savingMessageIndex]}
                </p>
              </div>
            </div>
          ) : null}

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
