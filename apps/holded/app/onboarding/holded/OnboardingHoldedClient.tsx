'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { auth } from '@/app/lib/firebase';
import { mintSessionCookie } from '@/app/lib/serverSession';

type ValidationResponse = {
  ok: boolean;
  error?: string | null;
  validationToken?: string | null;
};

type InitialIdentity = {
  companyName: string;
  legalName: string;
  taxId: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
};

type OnboardingHoldedClientProps = {
  channel: 'dashboard' | 'chatgpt';
  nextTarget: string;
  initialIdentity: InitialIdentity;
};

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeOptionalText(value: string) {
  const normalized = normalizeText(value);
  return normalized || '';
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
  channel,
  nextTarget,
  initialIdentity,
}: OnboardingHoldedClientProps) {
  const holdedApiGuideUrl =
    'https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded';

  const [companyName, setCompanyName] = useState(initialIdentity.companyName);
  const [legalName, setLegalName] = useState(initialIdentity.legalName);
  const [taxId, setTaxId] = useState(initialIdentity.taxId);
  const [contactFirstName, setContactFirstName] = useState(initialIdentity.contactFirstName);
  const [contactLastName, setContactLastName] = useState(initialIdentity.contactLastName);
  const [contactEmail, setContactEmail] = useState(initialIdentity.contactEmail);
  const [contactPhone, setContactPhone] = useState(initialIdentity.contactPhone);
  const [apiKey, setApiKey] = useState('');
  const [phase, setPhase] = useState<'idle' | 'validating' | 'connecting'>('idle');
  const [validationToken, setValidationToken] = useState<string | null>(null);
  const [validatedApiKey, setValidatedApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalizedApiKey = useMemo(() => normalizeApiKey(apiKey), [apiKey]);
  const normalizedCompanyName = useMemo(() => normalizeOptionalText(companyName), [companyName]);
  const normalizedLegalName = useMemo(() => normalizeOptionalText(legalName), [legalName]);
  const normalizedTaxId = useMemo(() => normalizeOptionalText(taxId).toUpperCase(), [taxId]);
  const normalizedContactFirstName = useMemo(
    () => normalizeOptionalText(contactFirstName),
    [contactFirstName]
  );
  const normalizedContactLastName = useMemo(
    () => normalizeOptionalText(contactLastName),
    [contactLastName]
  );
  const normalizedContactEmail = useMemo(
    () => normalizeOptionalText(contactEmail).toLowerCase(),
    [contactEmail]
  );
  const normalizedContactPhone = useMemo(() => normalizeOptionalText(contactPhone), [contactPhone]);
  const isSubmitting = phase !== 'idle';
  const hasReusableValidationToken =
    validatedApiKey === normalizedApiKey && Boolean(validationToken);
  const canSubmit =
    normalizedApiKey.length >= 16 &&
    normalizedCompanyName.length > 0 &&
    normalizedTaxId.length > 0 &&
    normalizedContactFirstName.length > 0 &&
    normalizedContactLastName.length > 0 &&
    looksLikeEmail(normalizedContactEmail) &&
    !isSubmitting;

  const statusCopy =
    phase === 'validating'
      ? {
          title: 'Estamos validando la API key',
          body: 'Comprobamos que la conexion con Holded es usable antes de guardarla.',
        }
      : phase === 'connecting'
        ? {
            title: 'Estamos cerrando la conexion',
            body: 'Guardamos empresa, contacto y conexion para dejar todo listo.',
          }
        : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedCompanyName || !normalizedTaxId) {
      setError('Necesitamos el nombre de la empresa y su NIF/CIF para continuar.');
      return;
    }

    if (
      !normalizedContactFirstName ||
      !normalizedContactLastName ||
      !looksLikeEmail(normalizedContactEmail)
    ) {
      setError('Necesitamos nombre, apellidos y un correo valido para la persona de contacto.');
      return;
    }

    if (normalizedApiKey.length < 16) {
      setError('Pega una API key valida de Holded para continuar.');
      return;
    }

    setError(null);

    try {
      let reusableToken = hasReusableValidationToken ? validationToken : null;

      if (!reusableToken) {
        setPhase('validating');

        const validationResponse = await postWithSessionRetry('/api/holded/validate', {
          apiKey: normalizedApiKey,
          channel,
        });

        if (validationResponse.status === 401) {
          redirectToHoldedReauth();
          return;
        }

        const validationData = (await validationResponse
          .json()
          .catch(() => null)) as ValidationResponse | null;

        if (!validationResponse.ok || !validationData?.ok) {
          throw new Error(validationData?.error || 'No hemos podido validar la API key de Holded.');
        }

        reusableToken = validationData.validationToken || null;
        setValidationToken(reusableToken);
        setValidatedApiKey(normalizedApiKey);
      }

      setPhase('connecting');

      const connectResponse = await postWithSessionRetry('/api/holded/connect', {
        apiKey: normalizedApiKey,
        channel,
        validationToken: reusableToken || undefined,
        companyName: normalizedCompanyName,
        legalName: normalizedLegalName || undefined,
        taxId: normalizedTaxId,
        contactFirstName: normalizedContactFirstName,
        contactLastName: normalizedContactLastName,
        contactEmail: normalizedContactEmail,
        contactPhone: normalizedContactPhone || undefined,
      });

      if (connectResponse.status === 401) {
        redirectToHoldedReauth();
        return;
      }

      const connectData = await connectResponse.json().catch(() => null);

      if (!connectResponse.ok || !connectData?.ok) {
        throw new Error(connectData?.error || 'No hemos podido conectar Holded.');
      }

      window.location.assign(nextTarget || '/onboarding/success');
    } catch (submitError) {
      setPhase('idle');
      setError(
        submitError instanceof Error ? submitError.message : 'No hemos podido conectar Holded.'
      );
    }
  };

  return (
    <main className="min-h-[100svh] bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              Conexion directa
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Conecta tu empresa de Holded
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Solo necesitamos los datos basicos de empresa, una persona de contacto y una API key
              activa de Holded. Nosotros dejamos la conexion lista por ti.
            </p>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Que te pediremos</div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                    <li>Empresa y NIF/CIF.</li>
                    <li>Persona de contacto principal.</li>
                    <li>Una API key activa de Holded.</li>
                  </ul>
                  <a
                    href={holdedApiGuideUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#ff5460] hover:text-[#ef4654]"
                  >
                    <FileText className="h-4 w-4" />
                    Ver guia oficial de Holded
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white p-5 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="text-sm font-semibold text-slate-900">Empresa</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Nombre de la empresa
                    <input
                      type="text"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="Tu empresa"
                      autoComplete="organization"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Razon social
                    <input
                      type="text"
                      value={legalName}
                      onChange={(event) => setLegalName(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="Opcional si coincide con el nombre comercial"
                      autoComplete="organization"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    NIF / CIF
                    <input
                      type="text"
                      value={taxId}
                      onChange={(event) => setTaxId(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm uppercase text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="B12345678"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">Contacto principal</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Nombre
                    <input
                      type="text"
                      value={contactFirstName}
                      onChange={(event) => setContactFirstName(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="Nombre"
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Apellidos
                    <input
                      type="text"
                      value={contactLastName}
                      onChange={(event) => setContactLastName(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="Apellidos"
                      autoComplete="family-name"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Correo de contacto
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="nombre@empresa.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Telefono
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      className="mt-2 h-12 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                      placeholder="Opcional"
                      autoComplete="tel"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">Conexion Holded</div>
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  API key de Holded
                  <textarea
                    value={apiKey}
                    onChange={(event) => {
                      setApiKey(event.target.value);
                      setValidationToken(null);
                      setValidatedApiKey('');
                      setError(null);
                    }}
                    rows={4}
                    placeholder="Pega aqui la API key generada en Holded"
                    className="mt-2 w-full resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    Al conectar aceptas los{' '}
                    <Link
                      href="/terms"
                      className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                    >
                      Terminos
                    </Link>{' '}
                    y la{' '}
                    <Link
                      href="/privacy"
                      className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                    >
                      Politica de Privacidad
                    </Link>
                    . La API key se guarda protegida y no vuelve a mostrarse en pantalla.
                  </div>
                </div>
              </div>

              {statusCopy ? (
                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#ff5460]" />
                    <div>
                      <div className="font-semibold text-slate-900">{statusCopy.title}</div>
                      <div className="mt-1">{statusCopy.body}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Validar y conectar
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
