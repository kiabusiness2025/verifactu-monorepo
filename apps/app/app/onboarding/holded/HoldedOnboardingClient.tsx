'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
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
  'Entra en Holded con tu usuario habitual.',
  'Abre ajustes de cuenta o el area de API.',
  'Copia una API key activa o crea una nueva si hace falta.',
  'Vuelve aqui y pegala para conectar tu entorno.',
  'Isaak empezara a trabajar sobre la cuenta asociada a esa API key.',
];

const valueCards = [
  {
    title: 'Revisar antes de presentar',
    body: 'Isaak usa tus datos reales para ayudarte a detectar errores y tareas pendientes.',
    icon: TriangleAlert,
  },
  {
    title: 'Anticipar impuestos',
    body: 'Te orienta con informacion fiscal y prioridades para decidir con mas margen.',
    icon: Gauge,
  },
  {
    title: 'Activar un entorno real',
    body: 'La conexion te mete de lleno en el ecosistema de verifactu.business con contexto real.',
    icon: ShieldCheck,
  },
];

const onboardingCopy = getIsaakHoldedOnboardingCopy();
const savingMessages = onboardingCopy.savingMessages;

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_48%,#ffffff_100%)] px-4 py-10 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_55%,#fff5f6_100%)] p-6 sm:p-8">
            <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-neutral-600 shadow-sm">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Compatible con Holded"
                width={16}
                height={16}
                className="h-4 w-4"
                priority
              />
              Compatible con Holded
            </div>

            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {onboardingCopy.eyebrow}
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-black sm:text-4xl">
                {onboardingCopy.title}
              </h1>

              <p className="mt-4 text-sm leading-7 text-neutral-700 sm:text-base">
                {onboardingCopy.intro}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {valueCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b6cfb]/10 text-[#0b6cfb]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-black">{item.title}</div>
                    <p className="mt-2 text-xs leading-6 text-neutral-600">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="text-sm font-semibold text-black">{onboardingCopy.statusReady}</div>
              <div className="mt-2 text-sm text-neutral-700">
                Espacio preparado: <span className="font-semibold text-black">{tenantName}</span>
              </div>
              <div className="mt-2 text-sm text-neutral-700">
                Estado actual: <span className="font-semibold text-black">{statusLabel}</span>
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                Solo falta conectar tu ERP para empezar a trabajar con Isaak.
              </p>
              {status?.degraded ? (
                <div className="mt-3 text-sm text-amber-700">{onboardingCopy.degraded}</div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)] p-5">
              <div className="text-sm font-semibold text-black">Lo que activas en este paso</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
                <li>Revision de informacion fiscal con datos reales.</li>
                <li>Mayor claridad para anticipar impuestos y detectar errores.</li>
                <li>Siguiente paso natural hacia la experiencia completa de verifactu.business.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold text-black">Como conectar tu cuenta</div>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Es un paso sencillo. Necesitamos la clave para que Isaak pueda trabajar sobre tu
              cuenta real de Holded.
            </p>
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
              Isaak trabajara sobre la cuenta asociada a la API key que introduzcas.
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0b6cfb]/10 text-[#0b6cfb]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-black">
                  Desbloquea la experiencia completa de Isaak
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Activa verifactu.business y accede a panel fiscal, trazabilidad, historico, reglas
                  automaticas y mayor control sobre tus procesos.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="https://verifactu.business"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Probar version completa 30 dias
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="https://verifactu.business/que-es-isaak"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Ver todo lo que incluye
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_48%,#fff4f5_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
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

              <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
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
  );
}
