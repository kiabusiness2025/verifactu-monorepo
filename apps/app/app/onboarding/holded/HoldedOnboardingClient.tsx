'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
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
  'Entra en Holded y abre el area de API.',
  'Copia una API key activa de tu empresa.',
  'Pegala aqui para activar tu espacio y entrar al chat de Isaak.',
];

const onboardingCopy = getIsaakHoldedOnboardingCopy();
const savingMessages = onboardingCopy.savingMessages;
const HOLDED_COMPAT_URL = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

export default function HoldedOnboardingClient({ nextUrl, tenantName, onboardingToken }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMessageIndex, setSavingMessageIndex] = useState(0);

  const statusLabel = useMemo(() => {
    if (status?.connected) return 'Isaak ya esta activado';
    if (loading) return onboardingCopy.statusLoading;
    return onboardingCopy.statusPending;
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
        if (!res.ok) throw new Error(data?.error || onboardingCopy.errorLoadFailed);
        if (cancelled) return;
        setStatus(data as IntegrationStatus);
        if (data?.connected && nextUrl) {
          window.location.replace(nextUrl);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : onboardingCopy.errorLoadFailed);
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
      setError(onboardingCopy.errorApiKeyEmpty);
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
      if (!res.ok)
        throw new Error(
          data?.debug || data?.detail || data?.error || `Error HTTP ${res.status} al activar Isaak`
        );
      if (!data?.ok) {
        throw new Error(
          data?.probe?.error ||
            data?.lastError ||
            'No hemos podido validar tu acceso con el ERP compatible'
        );
      }

      setMessage(onboardingCopy.successConnected);
      window.location.replace(nextUrl);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : onboardingCopy.errorConnectFailed
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_45%,#ffffff_100%)] px-4 py-10 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[30px] border border-neutral-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.09)]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <Link
              href={HOLDED_COMPAT_URL}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Link>
            <Link
              href={HOLDED_COMPAT_URL}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </Link>
          </div>

          <div className="p-6 sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {onboardingCopy.eyebrow}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-black sm:text-[2rem]">
              Activa tu conexion con Holded
            </h1>
            <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
              {onboardingCopy.intro}
            </p>

            <div className="mt-5 rounded-2xl border border-[#0b6cfb]/20 bg-[#f3f8ff] px-4 py-3 text-sm text-[#0b214a]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0b6cfb]" />
                <span>
                  Por seguridad, el chat de Isaak solo se habilita con sesion iniciada y cuenta
                  conectada.
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-sm font-semibold text-black">{onboardingCopy.statusReady}</div>
              <div className="mt-2 text-sm text-neutral-700">
                Espacio preparado: <span className="font-semibold text-black">{tenantName}</span>
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Estado: <span className="font-semibold text-black">{statusLabel}</span>
              </div>
              {status?.degraded ? (
                <div className="mt-2 text-sm text-amber-700">{onboardingCopy.degraded}</div>
              ) : null}
            </div>

            <ol className="mt-5 space-y-2 text-sm text-neutral-700">
              {helpSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black">
                Clave API de tu ERP (Holded)
              </span>
              <span className="mb-3 block text-sm text-neutral-600">
                Tus datos se usan unicamente para activar tu entorno de trabajo. Puedes desconectar
                la integracion cuando quieras.
              </span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Pega aqui la API key de Holded para activar Isaak"
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
                Conectar y activar Isaak
              </button>
            </div>
            </form>

            {saving ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_55%,#fff6f6_100%)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-black">
                    {onboardingCopy.statusLoading}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">
                    No cierres esta ventana. Estamos validando la conexion y preparando el contexto
                    inicial para Isaak.
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-[#ff5460]" />
              </div>

              <div className="mt-4 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Mientras lo dejamos listo
                </div>
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
    </div>
  );
}
