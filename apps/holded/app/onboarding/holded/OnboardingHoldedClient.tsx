'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { auth } from '@/app/lib/firebase';
import { mintSessionCookie } from '@/app/lib/serverSession';

type ValidationResponse = {
  ok: boolean;
  error?: string | null;
  validationToken?: string | null;
  probe?: {
    invoiceApi: { ok: boolean; status: number | null };
    accountingApi: { ok: boolean; status: number | null };
    crmApi: { ok: boolean; status: number | null };
    projectsApi: { ok: boolean; status: number | null };
    teamApi: { ok: boolean; status: number | null };
  };
};

type OnboardingHoldedClientProps = {
  sessionEmail?: string | null;
};

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

async function refreshSharedSession() {
  if (!auth?.currentUser) return false;

  try {
    await mintSessionCookie(auth.currentUser, { rememberDevice: true });
    return true;
  } catch {
    return false;
  }
}

async function postWithSessionRetry(url: string, body: Record<string, unknown>) {
  const makeRequest = () =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body),
    });

  let response = await makeRequest();
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshSharedSession();
  if (!refreshed) {
    return response;
  }

  response = await makeRequest();
  return response;
}

export function buildHoldedReauthHref(input: { origin: string; pathname: string; search: string }) {
  const loginUrl = new URL('/auth/holded', input.origin);
  loginUrl.searchParams.set('source', 'holded_onboarding_retry');
  loginUrl.searchParams.set('next', `${input.pathname}${input.search}`);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

function redirectToHoldedReauth() {
  if (typeof window === 'undefined') return;

  window.location.assign(
    buildHoldedReauthHref({
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
    })
  );
}

export default function OnboardingHoldedClient({
  sessionEmail = null,
}: OnboardingHoldedClientProps) {
  const searchParams = useSearchParams();
  const holdedApiGuideUrl =
    'https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded';
  const channel = searchParams?.get('channel') === 'chatgpt' ? 'chatgpt' : 'dashboard';
  const nextTarget = searchParams?.get('next')?.trim() || '';
  const initialNotificationEmail = sessionEmail?.trim() || '';

  const [apiKey, setApiKey] = useState('');
  const [notificationEmail, setNotificationEmail] = useState(initialNotificationEmail);
  const [isValidating, setIsValidating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [validationToken, setValidationToken] = useState<string | null>(null);
  const [validatedApiKey, setValidatedApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('No hemos podido continuar');

  const normalizedApiKey = useMemo(() => normalizeApiKey(apiKey), [apiKey]);
  const canValidate = normalizedApiKey.length >= 16;
  const emailIsLocked = initialNotificationEmail.length > 0;
  const canConnect = canValidate && !isConnecting && looksLikeEmail(notificationEmail.trim());
  const hasReusableValidationToken =
    validation?.ok === true && validatedApiKey === normalizedApiKey && Boolean(validationToken);

  const statusLine = useMemo(() => {
    if (!validation?.probe) return null;

    const checks = [
      validation.probe.invoiceApi.ok ? 'Facturas' : null,
      validation.probe.accountingApi.ok ? 'Contabilidad' : null,
      validation.probe.crmApi.ok ? 'CRM' : null,
      validation.probe.projectsApi.ok ? 'Proyectos' : null,
      validation.probe.teamApi.ok ? 'Equipo' : null,
    ].filter(Boolean);

    if (checks.length === 0) {
      return 'No hemos podido validar ningun modulo principal de Holded.';
    }

    return `Validacion correcta en: ${checks.join(', ')}.`;
  }, [validation]);

  const runValidation = async (value = normalizedApiKey) => {
    const targetApiKey = normalizeApiKey(value);
    if (targetApiKey.length < 16) return;

    setIsValidating(true);
    setError(null);
    setErrorTitle('No hemos podido validar la clave');

    try {
      const res = await postWithSessionRetry('/api/holded/validate', {
        apiKey: targetApiKey,
        channel,
      });

      if (res.status === 401) {
        redirectToHoldedReauth();
        return;
      }

      const data = (await res.json().catch(() => null)) as ValidationResponse | null;

      if (!res.ok) {
        throw new Error(data?.error || 'No hemos podido validar la API key.');
      }

      setValidation(data);
      setValidatedApiKey(targetApiKey);
      setValidationToken(data?.validationToken || null);

      if (!data?.ok) {
        setValidatedApiKey('');
        setValidationToken(null);
        setError(data?.error || 'No hemos podido validar la API key.');
      }
    } catch (validationError) {
      setValidation(null);
      setValidatedApiKey('');
      setValidationToken(null);
      setError(
        validationError instanceof Error
          ? validationError.message
          : 'No hemos podido validar la API key.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnect = async () => {
    const trimmedNotificationEmail = notificationEmail.trim();

    if (!looksLikeEmail(trimmedNotificationEmail)) {
      setError(
        'Necesitamos un correo valido para enviarte la confirmacion y los siguientes pasos.'
      );
      return;
    }

    setIsConnecting(true);
    setError(null);
    setErrorTitle('No hemos podido conectar Holded');

    try {
      const res = await postWithSessionRetry('/api/holded/connect', {
        apiKey: normalizedApiKey,
        channel,
        notificationEmail: trimmedNotificationEmail,
        validationToken: hasReusableValidationToken ? validationToken : undefined,
      });

      if (res.status === 401) {
        redirectToHoldedReauth();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No hemos podido conectar Holded.');
      }

      window.location.assign(nextTarget || '/onboarding/success');
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : 'No hemos podido conectar Holded.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="order-2 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:order-1">
            <div className="text-sm font-semibold text-slate-900">Si aun no la tienes</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              La API key se crea una sola vez dentro de Holded y luego solo tienes que pegarla aqui.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-900">1.</span> Entra en Holded y abre
                Configuracion.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-900">2.</span> Ve a Mas y despues a
                Desarrolladores.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-900">3.</span> Crea una nueva API key,
                copiala y pegala aqui.
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              Necesitas un usuario Owner o Administrador y, segun Holded, la API no esta disponible
              en el plan Free.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={holdedApiGuideUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Guia oficial de Holded
              </a>
              <Link
                href="/onboarding/holded/help"
                className="inline-flex items-center justify-center rounded-full border border-[#ff5460]/20 bg-[#fff5f6] px-4 py-2 text-sm font-semibold text-[#c53f4d] hover:bg-[#ffecee]"
              >
                Ayuda paso a paso
              </Link>
            </div>
          </section>

          <section className="order-1 rounded-[2rem] border border-[#ff5460]/15 bg-white p-5 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:p-6 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              Paso 2
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Pega tu API key de Holded
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              La validamos al momento y, si todo esta bien, terminamos la conexion sin mas pasos
              tecnicos.
            </p>

            <label className="block">
              <span className="mb-2 mt-5 block text-sm font-semibold text-slate-900">
                API key de Holded
              </span>
              <textarea
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setValidation(null);
                  setValidationToken(null);
                  setValidatedApiKey('');
                  setError(null);
                }}
                placeholder="Pega aqui la API key generada en Holded"
                rows={4}
                className="w-full resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
              />
            </label>

            <div className="mt-3 text-sm leading-6 text-slate-600">
              Pegala tal cual, sin espacios ni saltos de linea.
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <div>La clave se guarda protegida.</div>
                  <div>Puedes desconectarla cuando quieras.</div>
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">
                Correo para avisarte cuando quede conectado
              </span>
              <input
                type="email"
                value={notificationEmail}
                onChange={(event) => setNotificationEmail(event.target.value)}
                readOnly={emailIsLocked}
                placeholder="tu@empresa.com"
                className="h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10 read-only:cursor-not-allowed read-only:bg-slate-100 read-only:text-slate-500"
              />
            </label>

            <div className="mt-2 text-sm leading-6 text-slate-600">
              {emailIsLocked
                ? 'Usaremos el correo de tu acceso actual.'
                : 'Si no lo vemos en tu sesion, te avisaremos en este correo.'}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void runValidation()}
                disabled={!canValidate || isValidating || isConnecting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Validar ahora
              </button>
              <button
                type="button"
                onClick={handleConnect}
                disabled={!canConnect}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Conectar Holded
              </button>
            </div>

            <div className="mt-3 text-sm leading-6 text-slate-600">
              Puedes conectar directamente. Si pulsas "Validar ahora", reutilizaremos esa
              comprobacion para acelerar el paso final.
            </div>

            {validation?.ok ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">API key valida</div>
                    <div className="mt-1">{statusLine}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-semibold">{errorTitle}</div>
                    <div className="mt-1">{error}</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              Al continuar aceptas nuestros{' '}
              <Link href="/terms" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
                Terminos
              </Link>{' '}
              y{' '}
              <Link href="/privacy" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
                Politica de Privacidad
              </Link>
              . La API key se guarda protegida y no vuelve a mostrarse en pantalla.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
