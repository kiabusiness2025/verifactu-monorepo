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
import { useCallback, useEffect, useMemo, useState } from 'react';
import HoldedMergeAnimation from './HoldedMergeAnimation';

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
  entryChannel: 'dashboard' | 'chatgpt';
  nextUrl: string;
  tenantName: string;
  onboardingToken: string | null;
};

const onboardingCopy = getIsaakHoldedOnboardingCopy();
const HOLDED_COMPAT_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

const chatgptUiCopy = {
  eyebrow: 'Conecta Holded con ChatGPT',
  title: 'Activa tu conexion con Holded',
  intro:
    'Conecta tu cuenta de Holded para que ChatGPT pueda completar esta conexion con tus datos reales.',
  security:
    'Por seguridad, esta conexion solo se habilita con sesion iniciada y una clave valida de Holded.',
  statusReady: 'Tu espacio ya esta preparado',
  statusLoading: 'Preparando tu entorno de conexion',
  statusPending: 'Esperando tu clave de Holded',
  statusConnected: 'Conexion activada',
  checkingTitle: 'Estamos comprobando si tu espacio ya estaba conectado',
  checkingDescription:
    'Si ya tienes tu clave API, puedes pegarla ahora mismo. No hace falta esperar a que termine esta comprobacion para seguir.',
  savingDescription:
    'No cierres esta ventana. Estamos validando la conexion con Holded y preparando la vuelta a ChatGPT.',
  successConnected: 'Conexion activada. Te devolvemos a ChatGPT.',
  submitLabel: 'Conectar Holded',
  apiKeyLabel: 'Clave API de Holded',
  apiKeyHelp:
    'Tu clave solo se usa para activar esta conexion. Podras revocarla o cambiarla cuando quieras.',
  apiKeyPlaceholder: 'Pega aqui la API key de Holded para continuar',
  errorApiKeyEmpty: 'Necesitamos tu API key de Holded para completar esta conexion.',
  errorLoadFailed: 'No se pudo preparar la conexion con Holded.',
  errorConnectFailed:
    'No hemos podido validar la conexion. Revisa tu API key e intentalo de nuevo.',
  degraded:
    'No hemos podido leer el estado inicial, pero puedes continuar y conectar Holded igualmente.',
  redirectTitle: 'Tu conexion ya esta lista. Te devolvemos a ChatGPT.',
  redirectDescription:
    'Si esta pantalla no avanza sola en unos segundos, usa el boton de continuar.',
  helpSteps: [
    'Entra en Holded y abre el area de API.',
    'Copia una API key activa de tu empresa.',
    'Pegala aqui para completar la conexion y volver a ChatGPT.',
  ],
  savingMessages: [
    'Estamos validando tu clave de Holded.',
    'En cuanto termine, volveras a ChatGPT automaticamente.',
    'Estamos dejando lista la conexion con tus datos de facturacion y clientes.',
  ],
} as const;

const dashboardUiCopy = {
  eyebrow: onboardingCopy.eyebrow,
  title: 'Activa tu conexion con Holded',
  intro: onboardingCopy.intro,
  security:
    'Por seguridad, el chat de Isaak solo se habilita con sesion iniciada y cuenta conectada.',
  statusReady: onboardingCopy.statusReady,
  statusLoading: onboardingCopy.statusLoading,
  statusPending: onboardingCopy.statusPending,
  statusConnected: 'Isaak ya esta activado',
  checkingTitle: 'Estamos comprobando si tu espacio ya estaba conectado',
  checkingDescription:
    'Si ya tienes tu clave API, puedes pegarla ahora mismo. No hace falta esperar a que termine esta comprobacion para seguir.',
  savingDescription:
    'No cierres esta ventana. Estamos validando la conexion y preparando el contexto inicial para Isaak.',
  successConnected: onboardingCopy.successConnected,
  submitLabel: 'Conectar y activar Isaak',
  apiKeyLabel: 'Clave API de tu ERP (Holded)',
  apiKeyHelp:
    'Tus datos se usan unicamente para activar tu entorno de trabajo. Puedes desconectar la integracion cuando quieras.',
  apiKeyPlaceholder: 'Pega aqui la API key de Holded para activar Isaak',
  errorApiKeyEmpty: onboardingCopy.errorApiKeyEmpty,
  errorLoadFailed: onboardingCopy.errorLoadFailed,
  errorConnectFailed: onboardingCopy.errorConnectFailed,
  degraded: onboardingCopy.degraded,
  redirectTitle: 'Tu conexion ya esta lista. Te devolvemos al flujo de ChatGPT.',
  redirectDescription:
    'Si esta pantalla no avanza sola en unos segundos, usa el boton de continuar.',
  helpSteps: [
    'Entra en Holded y abre el area de API.',
    'Copia una API key activa de tu empresa.',
    'Pegala aqui para activar tu espacio y entrar al chat de Isaak.',
  ],
  savingMessages: onboardingCopy.savingMessages,
} as const;

export default function HoldedOnboardingClient({
  entryChannel,
  nextUrl,
  tenantName,
  onboardingToken,
}: Props) {
  const isChatgptEntry = entryChannel === 'chatgpt';
  const uiCopy = isChatgptEntry ? chatgptUiCopy : dashboardUiCopy;
  const savingMessages = uiCopy.savingMessages;
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMessageIndex, setSavingMessageIndex] = useState(0);

  const loadStatus = useCallback(
    async (signal?: AbortSignal) => {
      const res = await fetch(`/api/integrations/accounting/status?channel=${entryChannel}`, {
        cache: 'no-store',
        signal,
        headers: {
          'x-isaak-entry-channel': entryChannel,
          ...(onboardingToken ? { 'x-isaak-onboarding-token': onboardingToken } : {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || uiCopy.errorLoadFailed);
      return data as IntegrationStatus;
    },
    [entryChannel, onboardingToken, uiCopy.errorLoadFailed]
  );

  const statusLabel = useMemo(() => {
    if (status?.connected) return uiCopy.statusConnected;
    if (redirecting) return 'Llevandote de vuelta al chat';
    if (loading) return uiCopy.statusLoading;
    return uiCopy.statusPending;
  }, [
    loading,
    redirecting,
    status?.connected,
    uiCopy.statusConnected,
    uiCopy.statusLoading,
    uiCopy.statusPending,
  ]);

  const goToNextStep = useCallback(() => {
    if (!nextUrl) return;
    setRedirecting(true);
    window.location.replace(nextUrl);
  }, [nextUrl]);

  useEffect(() => {
    if (!saving) {
      setSavingMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setSavingMessageIndex((current) => (current + 1) % savingMessages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [saving, savingMessages]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadStatus(controller.signal);
        if (cancelled) return;
        setStatus(data);
        if (data?.connected && nextUrl) {
          goToNextStep();
        }
      } catch (loadError) {
        if (!cancelled) {
          const isAbortError = loadError instanceof DOMException && loadError.name === 'AbortError';
          setError(
            isAbortError
              ? 'La conexion tarda mas de lo normal. Pulsa Reintentar para continuar.'
              : loadError instanceof Error
                ? loadError.message
                : uiCopy.errorLoadFailed
          );
        }
      } finally {
        window.clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [goToNextStep, loadStatus, nextUrl, onboardingToken, uiCopy.errorLoadFailed]);

  const handleRetryStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadStatus();
      setStatus(data);
      if (data?.connected && nextUrl) {
        goToNextStep();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : uiCopy.errorLoadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError(uiCopy.errorApiKeyEmpty);
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
          'x-isaak-entry-channel': entryChannel,
          ...(onboardingToken ? { 'x-isaak-onboarding-token': onboardingToken } : {}),
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          data?.debug ||
            data?.detail ||
            data?.error ||
            `Error HTTP ${res.status} al activar ${isChatgptEntry ? 'la conexion' : 'Isaak'}`
        );
      if (!data?.ok) {
        throw new Error(
          data?.probe?.error ||
            data?.lastError ||
            'No hemos podido validar tu acceso con el ERP compatible'
        );
      }

      setMessage(uiCopy.successConnected);
      setStatus((current) =>
        current
          ? { ...current, connected: true, status: 'connected', lastError: null }
          : {
              provider: 'holded',
              status: 'connected',
              lastSyncAt: null,
              lastError: null,
              connected: true,
            }
      );
      goToNextStep();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : uiCopy.errorConnectFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_45%,#ffffff_100%)] px-4 py-6 text-black sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-[28px] border border-neutral-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.09)]">
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

          <div className="p-5 sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {uiCopy.eyebrow}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-[1.8rem]">
              {uiCopy.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-700 sm:text-base">{uiCopy.intro}</p>

            <div className="mt-5 rounded-2xl border border-[#0b6cfb]/20 bg-[#f3f8ff] px-4 py-3 text-sm text-[#0b214a]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0b6cfb]" />
                <span>{uiCopy.security}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-sm font-semibold text-black">{uiCopy.statusReady}</div>
              <div className="mt-2 text-sm text-neutral-700">
                Espacio preparado: <span className="font-semibold text-black">{tenantName}</span>
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Estado: <span className="font-semibold text-black">{statusLabel}</span>
              </div>
              {status?.degraded ? (
                <div className="mt-2 text-sm text-amber-700">{uiCopy.degraded}</div>
              ) : null}
            </div>

            {loading && !saving && !redirecting ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_52%,#fff7f8_100%)] p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
                  <HoldedMergeAnimation compact />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      Conexion en progreso
                    </div>
                    <div className="mt-2 text-base font-semibold text-black">
                      {uiCopy.checkingTitle}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">
                      {uiCopy.checkingDescription}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200">
                      <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-[#0b6cfb]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {redirecting ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_52%,#f7fbff_100%)] p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
                  <HoldedMergeAnimation compact />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      Ultimo paso
                    </div>
                    <div className="mt-2 text-base font-semibold text-black">
                      {uiCopy.redirectTitle}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">
                      {uiCopy.redirectDescription}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={nextUrl}
                        className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                      >
                        Continuar
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {!redirecting ? (
              <ol className="mt-4 space-y-2 text-sm text-neutral-700">
                {uiCopy.helpSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {!redirecting ? (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-black">
                    {uiCopy.apiKeyLabel}
                  </span>
                  <span className="mb-3 block text-sm text-neutral-600">{uiCopy.apiKeyHelp}</span>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={uiCopy.apiKeyPlaceholder}
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
                    {uiCopy.submitLabel}
                  </button>
                </div>
              </form>
            ) : null}

            {saving ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_55%,#fff6f6_100%)] p-4">
                <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
                  <HoldedMergeAnimation compact />
                  <div>
                    <div className="text-sm font-semibold text-black">{uiCopy.statusLoading}</div>
                    <div className="mt-1 text-sm text-neutral-600">{uiCopy.savingDescription}</div>
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
                    {uiCopy.savingMessages[savingMessageIndex]}
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
                <div className="space-y-2">
                  <span className="block">{error}</span>
                  {!saving ? (
                    <button
                      type="button"
                      onClick={handleRetryStatus}
                      className="rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Reintentar
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
