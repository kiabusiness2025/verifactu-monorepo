'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { auth } from '@/app/lib/firebase';
import { mintSessionCookie } from '@/app/lib/serverSession';
import type {
  DetectedCompanyDTO,
  GovernanceFlagsDTO,
  HoldedConnectResponse,
} from '@verifactu/integrations/holded/contracts';
import {
  getHoldedConnectionBadge,
  getHoldedGovernanceBadges,
  getHoldedStatusBanners,
} from '@verifactu/integrations/holded/uiState';
import type { HoldedUiBanner } from '@verifactu/integrations/holded/uiState';

type ValidationResponse = {
  ok: boolean;
  error?: string | null;
  validationToken?: string | null;
  detectedCompany?: DetectedCompanyDTO | null;
  duplicateConflict?: {
    exists: boolean;
    connectionId?: string | null;
    tenantId?: string | null;
    providerAccountId?: string | null;
    userHasAccess?: boolean;
    canRequestAccess?: boolean;
    canOpenClaim?: boolean;
    reason?: string | null;
  } | null;
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

type UiBadge = {
  key: string;
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
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

function badgeClasses(variant: UiBadge['variant']) {
  switch (variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'info':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'neutral':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function bannerClasses(tone: HoldedUiBanner['tone']) {
  switch (tone) {
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'info':
    default:
      return 'border-sky-200 bg-sky-50 text-sky-900';
  }
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

function buildStatusBadges(input: {
  governanceFlags: GovernanceFlagsDTO | null;
  connectResponse: HoldedConnectResponse | null;
}): UiBadge[] {
  const badges: UiBadge[] = [];

  if (input.connectResponse?.connection) {
    const mainBadge = getHoldedConnectionBadge(input.connectResponse.connection);
    badges.push(mainBadge);
  }

  for (const badge of getHoldedGovernanceBadges(input.governanceFlags)) {
    badges.push(badge);
  }

  return badges;
}

function buildBanners(input: {
  connectResponse: HoldedConnectResponse | null;
  warnings: string[];
}): HoldedUiBanner[] {
  return getHoldedStatusBanners({
    connection: input.connectResponse?.connection ?? null,
    governanceFlags: input.connectResponse?.governanceFlags ?? null,
    availableActions: input.connectResponse?.availableActions ?? null,
    warnings: input.warnings,
  });
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
  const [consentChecked, setConsentChecked] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'validating' | 'connecting' | 'connected'>('idle');
  const [validationToken, setValidationToken] = useState<string | null>(null);
  const [validatedApiKey, setValidatedApiKey] = useState('');
  const [detectedCompany, setDetectedCompany] = useState<DetectedCompanyDTO | null>(null);
  const [connectResponse, setConnectResponse] = useState<HoldedConnectResponse | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState<
    ValidationResponse['duplicateConflict'] | null
  >(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conflictAction, setConflictAction] = useState<'request' | 'claim' | null>(null);
  const [conflictMessage, setConflictMessage] = useState('');
  const [conflictWorking, setConflictWorking] = useState(false);

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
  const isSubmitting = phase === 'validating' || phase === 'connecting';
  const hasReusableValidationToken =
    validatedApiKey === normalizedApiKey && Boolean(validationToken);
  const canSubmit =
    normalizedApiKey.length >= 16 &&
    normalizedCompanyName.length > 0 &&
    normalizedTaxId.length > 0 &&
    normalizedContactFirstName.length > 0 &&
    normalizedContactLastName.length > 0 &&
    looksLikeEmail(normalizedContactEmail) &&
    consentChecked &&
    !isSubmitting;

  const statusBadges = useMemo(
    () =>
      buildStatusBadges({
        governanceFlags: connectResponse?.governanceFlags ?? null,
        connectResponse,
      }),
    [connectResponse]
  );
  const banners = useMemo(
    () =>
      buildBanners({
        connectResponse,
        warnings,
      }),
    [connectResponse, warnings]
  );

  const statusCopy =
    phase === 'validating'
      ? {
          title: 'Validando la API key',
          body: 'Comprobamos acceso, empresa detectada y posibles conflictos antes de guardar la conexion.',
        }
      : phase === 'connecting'
        ? {
            title: 'Activando el Conector Holded',
            body: 'Guardamos la conexion y evaluamos el estado inicial de gobernanza.',
          }
        : phase === 'connected'
          ? {
              title: 'Conexion lista',
              body:
                warnings.length > 0
                  ? 'La conexion esta activa, pero dejamos visibles las revisiones recomendadas antes de continuar.'
                  : 'La conexion esta activa. Te llevamos al siguiente paso.',
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

    if (!consentChecked) {
      setError('Debes confirmar la autorizacion y aceptar los documentos legales para continuar.');
      return;
    }

    setError(null);
    setMessage(null);
    setWarnings([]);
    setDuplicateConflict(null);
    setConflictAction(null);

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

        if (validationData.duplicateConflict?.exists) {
          setPhase('idle');
          setDetectedCompany(validationData.detectedCompany ?? null);
          setDuplicateConflict(validationData.duplicateConflict);
          setError(null);
          return;
        }

        reusableToken = validationData.validationToken || null;
        setValidationToken(reusableToken);
        setValidatedApiKey(normalizedApiKey);
        setDetectedCompany(validationData.detectedCompany ?? null);
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
        notificationEmail: normalizedContactEmail,
        acceptedTerms: true,
        acceptedPrivacy: true,
        authorizationConfirmed: true,
      });

      if (connectResponse.status === 401) {
        redirectToHoldedReauth();
        return;
      }

      const connectData = (await connectResponse
        .json()
        .catch(() => null)) as HoldedConnectResponse | null;

      if (!connectResponse.ok || !connectData?.ok) {
        throw new Error(connectData?.error || 'No hemos podido conectar Holded.');
      }

      setConnectResponse(connectData);
      setDetectedCompany(connectData.detectedCompany ?? detectedCompany);
      setWarnings(connectData.warnings ?? []);
      setPhase('connected');
      setMessage(
        connectData.warnings?.length
          ? `Conexion activada. Revision recomendada: ${connectData.warnings[0]}`
          : 'Conexion activada. Continuamos con el siguiente paso.'
      );

      window.setTimeout(
        () => {
          window.location.assign(nextTarget || '/onboarding/success');
        },
        connectData.warnings?.length ? 1600 : 900
      );
    } catch (submitError) {
      setPhase('idle');
      setError(
        submitError instanceof Error ? submitError.message : 'No hemos podido conectar Holded.'
      );
    }
  };

  const handleDuplicateConflictAction = async (action: 'request' | 'claim') => {
    if (!duplicateConflict?.connectionId) return;

    setConflictWorking(true);
    setError(null);
    setMessage(null);

    try {
      if (action === 'request') {
        const response = await postWithSessionRetry('/api/holded/access-requests', {
          connectionId: duplicateConflict.connectionId,
          requestedRole: 'viewer',
          message: conflictMessage || undefined,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || 'No se pudo enviar la solicitud de acceso.');
        }
        setMessage(
          'Solicitud enviada. La conexion actual queda pendiente de revision por el titular.'
        );
      } else {
        const reason =
          conflictMessage.trim() ||
          'La conexion actual no deberia seguir gestionandose desde esta organizacion.';
        const response = await postWithSessionRetry('/api/holded/claims', {
          connectionId: duplicateConflict.connectionId,
          claimType: 'control',
          reason,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || 'No se pudo abrir la reclamacion.');
        }
        setMessage('Reclamacion enviada. Algunas acciones quedaran limitadas hasta que se revise.');
      }

      setConflictAction(action);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : 'No se pudo completar la accion.'
      );
    } finally {
      setConflictWorking(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              Conector Holded
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Conecta tu cuenta de Holded
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Verifactu Business valida tu API key, detecta la empresa y deja la conexion lista con
              estados tecnicos y de gobernanza visibles desde el principio.
            </p>

            <div className="mt-6 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              {[
                {
                  step: '1',
                  title: 'Empresa',
                  text: 'Revisamos empresa, contacto principal y base fiscal.',
                },
                {
                  step: '2',
                  title: 'API Holded',
                  text: 'Validamos la API key y comprobamos acceso real.',
                },
                {
                  step: '3',
                  title: 'Activacion',
                  text: 'Guardamos la conexion y mostramos revisiones necesarias.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {item.step}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="text-sm leading-6 text-slate-600">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Antes de empezar</div>
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

            {detectedCompany ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Sparkles className="h-4 w-4 text-[#ff5460]" />
                  Empresa detectada
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  {detectedCompany.companyName || detectedCompany.legalName || 'Empresa detectada'}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {detectedCompany.taxId || 'Sin NIF/CIF detectado'}
                </div>
                {detectedCompany.isPartial ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Faltan campos por completar: {detectedCompany.missingFields.join(', ')}.
                  </div>
                ) : null}
              </div>
            ) : null}

            {duplicateConflict?.exists ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-amber-900">
                      Esta empresa ya esta conectada
                    </div>
                    <div className="mt-1 text-sm leading-6 text-amber-900">
                      {duplicateConflict.reason ||
                        'Puedes solicitar acceso a la conexion existente o abrir una reclamacion de control.'}
                    </div>
                    <textarea
                      value={conflictMessage}
                      onChange={(event) => setConflictMessage(event.target.value)}
                      rows={3}
                      placeholder="Mensaje opcional para la solicitud o motivo de la reclamacion"
                      className="mt-4 w-full resize-none rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                      {duplicateConflict.canRequestAccess ? (
                        <button
                          type="button"
                          disabled={conflictWorking}
                          onClick={() => void handleDuplicateConflictAction('request')}
                          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Solicitar acceso
                        </button>
                      ) : null}
                      {duplicateConflict.canOpenClaim ? (
                        <button
                          type="button"
                          disabled={conflictWorking}
                          onClick={() => void handleDuplicateConflictAction('claim')}
                          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Abrir reclamacion
                        </button>
                      ) : null}
                    </div>
                    {conflictAction ? (
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                        Ultima accion enviada:{' '}
                        {conflictAction === 'request' ? 'solicitud de acceso' : 'reclamacion'}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {statusBadges.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {statusBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(badge.variant)}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}

            {banners.length > 0 ? (
              <div className="mt-6 space-y-3">
                {banners.map((banner) => (
                  <div
                    key={banner.key}
                    className={`rounded-3xl border px-4 py-4 text-sm ${bannerClasses(banner.tone)}`}
                  >
                    <div className="flex items-start gap-3">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">{banner.title}</div>
                        <div className="mt-1 leading-6">{banner.message}</div>
                        {banner.actionLabel ? (
                          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.12em]">
                            Accion sugerida: {banner.actionLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
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
                <div className="text-sm font-semibold text-slate-900">Conector Holded</div>
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  API key de Holded
                  <textarea
                    value={apiKey}
                    onChange={(event) => {
                      setApiKey(event.target.value);
                      setValidationToken(null);
                      setValidatedApiKey('');
                      setDuplicateConflict(null);
                      setConflictAction(null);
                      setError(null);
                    }}
                    rows={4}
                    placeholder="Pega aqui la API key generada en Holded"
                    className="mt-2 w-full resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(event) => setConsentChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff5460] focus:ring-[#ff5460]"
                />
                <span>
                  Confirmo que puedo conectar esta empresa y acepto los{' '}
                  <Link href="/terms" className="font-semibold text-[#ff5460] hover:text-[#ef4654]">
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
                </span>
              </label>

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

              {message ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{message}</span>
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
