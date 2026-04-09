'use client';

import { auth } from '@/lib/firebase';
import { buildFullName, getPreferredFirstName } from '@/lib/personName';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HoldedCompanySetupState } from './flowState';
import {
  createCompanyDraftFromSummary,
  createSummaryForFreshApiValidation,
  type HoldedOnboardingSummary,
} from './summaryState';
import {
  CNAE_SECTION_OPTIONS,
  COMPANY_ROLE_OPTIONS,
  getCnaeSectionLabel,
  getCompanyRoleLabel,
} from './profileOptions';

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

type ValidationResponse = {
  ok: boolean;
  error?: string | null;
  detail?: string | null;
  debug?: string | null;
  validationToken?: string | null;
  probe?: {
    error?: string | null;
  } | null;
};

type TenantCreateResponse = {
  ok?: boolean;
  error?: string | null;
  action?: string | null;
  tenantId?: string | null;
  onboardingToken?: string | null;
};

type IdentityResponse = {
  ok?: boolean;
  error?: string | null;
  detail?: string | null;
  alreadyVerified?: boolean;
  onboardingToken?: string | null;
  identity?: {
    authMethod?: 'unknown' | 'google' | 'email';
    email?: string | null;
    emailVerified?: boolean;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    verifiedAt?: string | null;
  } | null;
};

type OnboardingIdentityState = {
  authMethod: 'unknown' | 'google' | 'email';
  email: string | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  verifiedAt: string | null;
};

type DirectOnboardingStep = 'identity' | 'person' | 'company' | 'api' | 'success';

type Props = {
  captureMode: boolean;
  entryChannel: 'dashboard' | 'chatgpt';
  nextUrl: string;
  requireConnectionConfirmation: boolean;
  requiresVerifiedIdentity: boolean;
  identity: OnboardingIdentityState;
  summary: HoldedOnboardingSummary;
  companySetup: HoldedCompanySetupState;
  onboardingToken?: string | null;
  tenantIdHint?: string | null;
};

const HOLDED_COMPAT_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const CHATGPT_HOME_URL = 'https://chatgpt.com';
const HOLDED_API_GUIDE_URL =
  'https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded';
const VERIFACTU_TERMS_URL = 'https://verifactu.business/terms';
const VERIFACTU_PRIVACY_URL = 'https://verifactu.business/privacy';

function HoldedStatusVisual({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-[26px] border border-[#d9e6ff] bg-white/90 p-4 shadow-sm">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1f2] ring-1 ring-[#ff5460]/12">
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded"
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {eyebrow}
        </div>
        <div className="mt-1 text-sm font-semibold text-black">{title}</div>
      </div>
    </div>
  );
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function getIdentityStrength(identity: OnboardingIdentityState) {
  return [
    identity.email ? 1 : 0,
    identity.authMethod !== 'unknown' ? 1 : 0,
    identity.emailVerified ? 2 : 0,
    identity.verifiedAt ? 1 : 0,
    identity.firstName || identity.lastName ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

function shouldAdoptIncomingIdentity(
  current: OnboardingIdentityState,
  incoming: OnboardingIdentityState
) {
  const incomingEmail = normalizeText(incoming.email).toLowerCase();
  const currentEmail = normalizeText(current.email).toLowerCase();
  const incomingStrength = getIdentityStrength(incoming);
  const currentStrength = getIdentityStrength(current);

  if (!incomingStrength) return false;
  if (incomingStrength > currentStrength) return true;
  if (incomingEmail && incomingEmail !== currentEmail) return true;
  if (incoming.verifiedAt && incoming.verifiedAt !== current.verifiedAt) return true;
  if (incoming.emailVerified && !current.emailVerified) return true;
  if (incoming.authMethod === 'google' && current.authMethod !== 'google') return true;

  return false;
}

function buildAddressPreview(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
}) {
  const locality = [normalizeText(parts.postalCode), normalizeText(parts.city)]
    .filter(Boolean)
    .join(' ');

  return [
    normalizeText(parts.address),
    locality || null,
    normalizeText(parts.province),
    normalizeText(parts.country),
  ]
    .filter(Boolean)
    .join(', ');
}

function getGoogleIdentityErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  if (code === 'auth/popup-closed-by-user') {
    return 'La ventana de Google se ha cerrado antes de terminar. Vuelve a intentarlo y permite el popup si tu navegador lo bloquea.';
  }

  if (code === 'auth/popup-blocked') {
    return 'Tu navegador ha bloqueado la ventana de Google. Permite los popups para este sitio y vuelve a intentarlo.';
  }

  if (code === 'auth/cancelled-popup-request') {
    return 'Ya hay un acceso con Google en curso. Cierra la otra ventana y vuelve a intentarlo.';
  }

  if (message.includes('Cross-Origin-Opener-Policy') || message.includes('window.closed')) {
    return 'Tu navegador ha bloqueado la comunicacion con la ventana de Google. Recarga la pagina y vuelve a intentarlo.';
  }

  return error instanceof Error
    ? error.message
    : 'No hemos podido verificar tu identidad con Google.';
}

function isMissingOnboardingSessionError(input: { status?: number; error?: string | null }) {
  return input.status === 401 || input.error === 'onboarding session required';
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function buildConfirmedNextUrl(input: {
  nextUrl: string;
  requireConnectionConfirmation: boolean;
  onboardingToken?: string | null;
  tenantIdHint?: string | null;
}) {
  if (!input.requireConnectionConfirmation) return input.nextUrl;

  try {
    const parsed = new URL(input.nextUrl, HOLDED_COMPAT_URL);
    if (parsed.pathname === '/oauth/authorize') {
      parsed.searchParams.set('connection_confirmed', '1');

      const normalizedOnboardingToken = input.onboardingToken?.trim() || null;
      const normalizedTenantIdHint = input.tenantIdHint?.trim() || null;

      if (normalizedOnboardingToken) {
        parsed.searchParams.set('onboarding_token', normalizedOnboardingToken);
      }

      if (normalizedTenantIdHint) {
        parsed.searchParams.set('tenant_id', normalizedTenantIdHint);
      }
    }

    return parsed.toString();
  } catch {
    return input.nextUrl;
  }
}

const chatgptUiCopy = {
  eyebrow: 'Conector directo Holded + ChatGPT',
  title: 'Conecta tu empresa de Holded',
  intro: 'Confirma tu identidad, conecta Holded y vuelve a ChatGPT.',
  security: 'Validamos la conexion en servidor y protegemos la API key.',
  statusReady: 'Empresa preparada para conectar',
  statusLoading: 'Validando acceso y preparando la conexion',
  statusPending: 'Esperando tu API key de Holded',
  statusConnected: 'Conexion confirmada',
  checkingTitle: 'Estamos comprobando si ya existe una conexion valida',
  checkingDescription:
    'Si ya existe una conexion valida, evitaremos repetir pasos antes de volver a ChatGPT.',
  savingDescription:
    'No cierres esta ventana. Estamos validando la API key y preparando la vuelta a ChatGPT.',
  successConnected: 'Conexion activada. Volvemos a ChatGPT.',
  submitLabel: 'Conectar Holded',
  apiKeyLabel: 'Clave API de Holded',
  apiKeyHelp: 'Solo necesitamos una API key activa para validar Holded y cerrar la conexion.',
  apiKeyPlaceholder: 'Pega aqui la API key de Holded para continuar',
  errorApiKeyEmpty: 'Necesitamos tu API key de Holded para completar esta conexion.',
  errorLoadFailed: 'No se pudo preparar la conexion con Holded.',
  errorConnectFailed:
    'No hemos podido validar la conexion. Revisa tu API key e intentalo de nuevo.',
  degraded:
    'No hemos podido leer el estado inicial, pero puedes continuar y conectar Holded igualmente.',
  redirectTitle: 'Tu conexion ya esta lista. Volvemos a ChatGPT.',
  redirectDescription:
    'Si esta pantalla no avanza sola en unos segundos, usa el boton de continuar.',
  helpSteps: [
    'Confirma tu identidad con Google o con un correo verificado.',
    'Abre Holded y copia una API key activa de tu empresa.',
    'Pegala aqui y volveremos a ChatGPT en cuanto la conexion quede lista.',
  ],
  savingMessages: [
    'Estamos validando tu API key de Holded.',
    'Estamos dejando preparada la empresa asociada a esta conexion.',
    'En cuanto termine, volveras a ChatGPT automaticamente.',
  ],
} as const;

const dashboardUiCopy = {
  eyebrow: 'Conexion Holded en Verifactu',
  title: 'Conecta tu empresa de Holded',
  intro: 'Pega tu API key de Holded y dejaremos la conexion lista para tu espacio en Verifactu.',
  security: 'La API key se valida en servidor y se guarda como conexion segura del tenant.',
  statusReady: 'Empresa preparada para conectar',
  statusLoading: 'Validando acceso y preparando la conexion',
  statusPending: 'Esperando tu API key de Holded',
  statusConnected: 'Conexion confirmada',
  checkingTitle: 'Estamos comprobando si ya existe una conexion valida',
  checkingDescription:
    'Si ya existe una conexion valida, evitaremos repetir pasos dentro de Verifactu.',
  savingDescription:
    'No cierres esta ventana. Estamos validando la API key y dejando la conexion lista para tu empresa.',
  successConnected: 'Conexion activada. Tu empresa ya esta lista.',
  submitLabel: 'Conectar Holded',
  apiKeyLabel: 'Clave API de tu ERP (Holded)',
  apiKeyHelp: 'Solo necesitamos una API key activa para dejar lista la conexion de tu empresa.',
  apiKeyPlaceholder: 'Pega aqui la API key de Holded para continuar',
  errorApiKeyEmpty: 'Necesitamos tu API key de Holded para completar esta conexion.',
  errorLoadFailed: 'No se pudo preparar la conexion con Holded.',
  errorConnectFailed:
    'No hemos podido validar la conexion. Revisa tu API key e intentalo de nuevo.',
  degraded:
    'No hemos podido leer el estado inicial, pero puedes continuar y conectar Holded igualmente.',
  redirectTitle: 'Tu conexion ya esta lista.',
  redirectDescription:
    'Si esta pantalla no avanza sola en unos segundos, usa el boton de continuar.',
  helpSteps: [
    'Abre Holded y copia una API key activa de tu empresa.',
    'Pegala aqui y dejaremos lista la conexion para tu tenant de Verifactu.',
  ],
  savingMessages: [
    'Estamos validando tu API key de Holded.',
    'Estamos guardando la conexion segura de tu empresa.',
    'En cuanto termine, continuaremos automaticamente con el siguiente paso.',
  ],
} as const;

const chatgptHighlights = [
  'Sin login visible.',
  'Clave validada en servidor.',
  'Vuelta automatica a ChatGPT.',
] as const;

const dashboardHighlights = [
  'Conexion guardada en servidor para tu tenant.',
  'Sin repetir la clave en pasos intermedios.',
  'Gestionable despues desde integraciones.',
] as const;

export default function HoldedOnboardingClient({
  captureMode,
  entryChannel,
  nextUrl,
  requireConnectionConfirmation,
  requiresVerifiedIdentity,
  identity,
  summary,
  companySetup,
  onboardingToken = null,
  tenantIdHint = null,
}: Props) {
  const isChatgptEntry = entryChannel === 'chatgpt';
  const usesDirectStepFlow = isChatgptEntry;
  const needsPostValidationCompanyStep = isChatgptEntry;
  const uiCopy = isChatgptEntry ? chatgptUiCopy : dashboardUiCopy;
  const uiHighlights = isChatgptEntry ? chatgptHighlights : dashboardHighlights;
  const savingMessages = uiCopy.savingMessages;
  const hasResolvedCompanyProfile =
    companySetup.hasResolvedCompany &&
    Boolean(
      summary.contactEmail &&
      summary.companyTaxId &&
      summary.contactRole &&
      summary.companyAddress &&
      summary.companyPostalCode &&
      summary.companyCity &&
      summary.companyProvince &&
      summary.companyCountry &&
      summary.companySectorCode
    );
  const reusesStoredCompanyData = isChatgptEntry && hasResolvedCompanyProfile;
  const initialCompanyDraft = useMemo(() => createCompanyDraftFromSummary(summary), [summary]);
  const freshValidationSummary = useMemo(
    () => createSummaryForFreshApiValidation(summary),
    [summary]
  );
  const [apiKey, setApiKey] = useState('');
  const [validationToken, setValidationToken] = useState<string | null>(null);
  const [validatedApiKey, setValidatedApiKey] = useState('');
  const [resolvedSummary, setResolvedSummary] = useState(summary);
  const [companyLegalName, setCompanyLegalName] = useState(initialCompanyDraft.companyLegalName);
  const [companyTaxId, setCompanyTaxId] = useState(initialCompanyDraft.companyTaxId);
  const [companyAddress, setCompanyAddress] = useState(initialCompanyDraft.companyAddress);
  const [companyPostalCode, setCompanyPostalCode] = useState(initialCompanyDraft.companyPostalCode);
  const [companyCity, setCompanyCity] = useState(initialCompanyDraft.companyCity);
  const [companyProvince, setCompanyProvince] = useState(initialCompanyDraft.companyProvince);
  const [companyCountry, setCompanyCountry] = useState(initialCompanyDraft.companyCountry);
  const [companyWebsite, setCompanyWebsite] = useState(initialCompanyDraft.companyWebsite);
  const [companySectorCode, setCompanySectorCode] = useState(initialCompanyDraft.companySectorCode);
  const [contactFirstName, setContactFirstName] = useState(initialCompanyDraft.contactFirstName);
  const [contactLastName, setContactLastName] = useState(initialCompanyDraft.contactLastName);
  const [contactRole, setContactRole] = useState(initialCompanyDraft.contactRole);
  const [contactEmail, setContactEmail] = useState(initialCompanyDraft.contactEmail);
  const [contactPhone, setContactPhone] = useState(initialCompanyDraft.contactPhone);
  const [apiValidated, setApiValidated] = useState(!needsPostValidationCompanyStep);
  const [showCompanyForm, setShowCompanyForm] = useState(!hasResolvedCompanyProfile);
  const [companyConfirmed, setCompanyConfirmed] = useState(!needsPostValidationCompanyStep);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(!needsPostValidationCompanyStep);
  const [saving, setSaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState(nextUrl);
  const [activeOnboardingToken, setActiveOnboardingToken] = useState(onboardingToken);
  const [identityState, setIdentityState] = useState(identity);
  const [manualEmail, setManualEmail] = useState(identity.email ?? summary.contactEmail ?? '');
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [directStep, setDirectStep] = useState<DirectOnboardingStep>(
    requiresVerifiedIdentity && !identity.emailVerified ? 'identity' : 'person'
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMessageIndex, setSavingMessageIndex] = useState(0);
  const acceptedTerms = true;
  const acceptedPrivacy = true;
  const initialTenantIdHint = tenantIdHint?.trim() || null;
  const normalizedIdentityEmail = normalizeText(identityState.email).toLowerCase();
  const verifiedIdentityReady =
    !requiresVerifiedIdentity ||
    ((identityState.authMethod === 'google' || identityState.emailVerified) &&
      !!normalizedIdentityEmail);
  const showIdentityGate = requiresVerifiedIdentity && !verifiedIdentityReady;
  const hideResolvedCompanyUntilApiValidation = needsPostValidationCompanyStep && !apiValidated;
  const companyStepPending =
    !showIdentityGate &&
    needsPostValidationCompanyStep &&
    apiValidated &&
    (showCompanyForm || !companyConfirmed);
  const showCompanyLegalName =
    !!resolvedSummary.companyLegalName &&
    resolvedSummary.companyLegalName.trim().toLowerCase() !==
      resolvedSummary.companyName.trim().toLowerCase();
  const showCompanyEmail =
    !!resolvedSummary.companyEmail &&
    resolvedSummary.companyEmail.trim() !== (resolvedSummary.contactEmail || '').trim();
  const confirmationModeNeedsExistingConnectionCheck =
    requireConnectionConfirmation && hasResolvedCompanyProfile;
  const canContinueWithExistingConnection =
    !!status?.connected &&
    !showIdentityGate &&
    requireConnectionConfirmation &&
    !saving &&
    !redirecting &&
    (confirmationModeNeedsExistingConnectionCheck || companyConfirmed);
  const showApiStep =
    !showIdentityGate &&
    (!needsPostValidationCompanyStep || !apiValidated) &&
    !canContinueWithExistingConnection;
  const normalizedApiKey = useMemo(() => normalizeApiKey(apiKey), [apiKey]);
  const hasReusableValidationToken =
    validatedApiKey === normalizedApiKey && Boolean(validationToken);
  const usesInlineDirectForm = needsPostValidationCompanyStep && !hasResolvedCompanyProfile;
  const hasInlineDirectFormMinimum =
    !!normalizeText(companyLegalName) &&
    !!normalizeText(companyTaxId) &&
    !!normalizeText(contactFirstName) &&
    !!normalizeText(contactLastName) &&
    !!normalizeText(contactEmail);
  const canContinuePersonStep =
    !!normalizeText(contactFirstName) &&
    !!normalizeText(contactLastName) &&
    !!normalizeText(contactRole);
  const canContinueCompanyStep =
    !!normalizeText(companyLegalName) &&
    !!normalizeText(companyTaxId) &&
    !!normalizeText(companyAddress) &&
    !!normalizeText(companyPostalCode) &&
    !!normalizeText(companyCity) &&
    !!normalizeText(companyProvince) &&
    !!normalizeText(companyCountry) &&
    !!normalizeText(companySectorCode);
  const stepContactEmail = normalizeText(contactEmail) || normalizeText(identityState.email);
  const currentDirectFullName =
    buildFullName({ firstName: contactFirstName, lastName: contactLastName }) ||
    resolvedSummary.contactFullName;
  const currentDirectRoleLabel =
    getCompanyRoleLabel(normalizeText(contactRole) || resolvedSummary.contactRole) || 'Sin rol';
  const currentDirectCompanyName = normalizeText(companyLegalName) || resolvedSummary.companyName;
  const currentDirectCompanySector =
    getCnaeSectionLabel({
      code: normalizeText(companySectorCode) || resolvedSummary.companySectorCode,
      fallback: resolvedSummary.companySectorLabel,
    }) || 'Sin sector';
  const currentDirectCompanyAddress =
    buildAddressPreview({
      address: normalizeText(companyAddress) || resolvedSummary.companyAddress,
      postalCode: normalizeText(companyPostalCode) || resolvedSummary.companyPostalCode,
      city: normalizeText(companyCity) || resolvedSummary.companyCity,
      province: normalizeText(companyProvince) || resolvedSummary.companyProvince,
      country: normalizeText(companyCountry) || resolvedSummary.companyCountry,
    }) || 'Sin domicilio';
  const apiKeyHelp = reusesStoredCompanyData
    ? 'Validaremos la API key y cerraremos la conexion sin pasos visibles extra.'
    : uiCopy.apiKeyHelp;
  const helpSteps = reusesStoredCompanyData
    ? [
        'Abre Holded y copia una API key activa de tu empresa.',
        'Pegala aqui y terminaremos la conexion para devolverte al flujo original.',
      ]
    : usesInlineDirectForm
      ? [
          'Completa empresa y contacto.',
          'Pega una API key activa de Holded.',
          'Validaremos la conexion y volveremos al flujo original.',
        ]
      : uiCopy.helpSteps;
  const redirectDescription = captureMode
    ? 'Tu conexion ya esta lista. Puedes continuar manualmente cuando quieras.'
    : uiCopy.redirectDescription;
  const submitLabel =
    needsPostValidationCompanyStep && !apiValidated
      ? reusesStoredCompanyData
        ? 'Validar y conectar Holded'
        : usesInlineDirectForm
          ? 'Validar y conectar Holded'
          : 'Validar API key'
      : uiCopy.submitLabel;
  const personalizedLead = showIdentityGate
    ? identityState.authMethod === 'email' && identityState.email
      ? `Revisa ${identityState.email} para confirmar el correo.`
      : 'Elige como quieres confirmar tu identidad.'
    : !showApiStep
      ? reusesStoredCompanyData
        ? `${resolvedSummary.contactFirstName}, ya hemos resuelto internamente la empresa y estamos cerrando la conexion directa con Holded.`
        : `${resolvedSummary.contactFirstName}, ahora solo necesitamos confirmar los datos minimos de empresa y contacto para terminar la conexion.`
      : hideResolvedCompanyUntilApiValidation
        ? reusesStoredCompanyData
          ? 'Primero validaremos tu API key y, si es correcta, cerraremos la conexion directa sin pasos manuales extra.'
          : usesInlineDirectForm
            ? 'Completa este formulario directo con tu empresa y tu API key de Holded. Nosotros resolvemos el resto sin mostrarte login ni registro.'
            : 'Primero validaremos tu API key. Solo si hace falta te pediremos confirmar los datos de empresa asociados a la conexion.'
        : isChatgptEntry
          ? `${resolvedSummary.contactFirstName}, validaremos tu API key y dejaremos lista la conexion directa con Holded para volver a ChatGPT.`
          : `${resolvedSummary.contactFirstName}, vamos a dejar lista la conexion de ${resolvedSummary.companyName} dentro de Verifactu.`;

  useEffect(() => {
    if (!onboardingToken || activeOnboardingToken || onboardingToken === activeOnboardingToken) {
      return;
    }

    setActiveOnboardingToken(onboardingToken);
  }, [activeOnboardingToken, onboardingToken]);

  useEffect(() => {
    setIdentityState((current) => {
      if (!shouldAdoptIncomingIdentity(current, identity)) {
        return current;
      }

      return identity;
    });
  }, [identity]);

  useEffect(() => {
    if (!usesDirectStepFlow) return;

    if (showIdentityGate) {
      setDirectStep('identity');
      return;
    }

    setDirectStep((current) => (current === 'identity' ? 'person' : current));
  }, [showIdentityGate, usesDirectStepFlow]);

  useEffect(() => {
    if (identityState.email && !contactEmail) {
      setContactEmail(identityState.email);
    }

    if (identityState.firstName && !contactFirstName) {
      setContactFirstName(identityState.firstName);
    }

    if (identityState.lastName && !contactLastName) {
      setContactLastName(identityState.lastName);
    }
  }, [contactEmail, contactFirstName, contactLastName, identityState]);

  useEffect(() => {
    if (!usesDirectStepFlow) return;

    if (identityState.email && !manualEmail) {
      setManualEmail(identityState.email);
    }
  }, [identityState.email, manualEmail, usesDirectStepFlow]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const verifiedFromUrl = url.searchParams.get('identity_verified') === '1';
    const onboardingTokenFromUrl = normalizeText(url.searchParams.get('onboarding_token')) || null;

    if (
      verifiedFromUrl &&
      onboardingTokenFromUrl &&
      onboardingTokenFromUrl !== activeOnboardingToken
    ) {
      setActiveOnboardingToken(onboardingTokenFromUrl);
    }

    if (!verifiedFromUrl || !identityState.emailVerified) return;

    setIdentityError(null);
    setIdentityMessage(
      identityState.authMethod === 'email' && identityState.email
        ? `Correo confirmado para ${identityState.email}. Ya puedes continuar con el paso Usuario.`
        : 'Identidad confirmada. Ya puedes continuar con el paso Usuario.'
    );

    if (usesDirectStepFlow) {
      setDirectStep((current) => (current === 'identity' ? 'person' : current));
    }

    url.searchParams.delete('identity_verified');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [
    activeOnboardingToken,
    identityState.authMethod,
    identityState.email,
    identityState.emailVerified,
    usesDirectStepFlow,
  ]);

  const resolveConfirmedNextUrl = useCallback(
    (overrides?: { onboardingToken?: string | null; tenantIdHint?: string | null }) => {
      const effectiveOnboardingToken =
        overrides && Object.prototype.hasOwnProperty.call(overrides, 'onboardingToken')
          ? (overrides.onboardingToken ?? null)
          : activeOnboardingToken;
      const effectiveTenantIdHint =
        overrides && Object.prototype.hasOwnProperty.call(overrides, 'tenantIdHint')
          ? (overrides.tenantIdHint ?? null)
          : (selectedTenantId ?? initialTenantIdHint);

      return buildConfirmedNextUrl({
        nextUrl,
        requireConnectionConfirmation,
        onboardingToken: effectiveOnboardingToken,
        tenantIdHint: effectiveTenantIdHint,
      });
    },
    [
      activeOnboardingToken,
      initialTenantIdHint,
      nextUrl,
      requireConnectionConfirmation,
      selectedTenantId,
    ]
  );

  const resolveRequestOnboardingToken = useCallback(() => {
    const tokenFromState = normalizeText(activeOnboardingToken);
    if (tokenFromState) {
      return tokenFromState;
    }

    const tokenFromProp = normalizeText(onboardingToken);
    if (tokenFromProp) {
      return tokenFromProp;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    return normalizeText(new URL(window.location.href).searchParams.get('onboarding_token'));
  }, [activeOnboardingToken, onboardingToken]);

  const restartIdentityFlow = useCallback(() => {
    setIdentityError(
      'Hemos perdido la sesion temporal del conector. Vamos a reiniciar el acceso para continuar.'
    );

    if (captureMode || typeof window === 'undefined') {
      return;
    }

    const restartTarget =
      entryChannel === 'chatgpt' && nextUrl.includes('/oauth/authorize')
        ? nextUrl
        : window.location.href;

    setRedirecting(true);
    setRedirectTarget(restartTarget);
    window.location.replace(restartTarget);
  }, [captureMode, entryChannel, nextUrl]);

  const confirmedNextUrl = useMemo(() => resolveConfirmedNextUrl(), [resolveConfirmedNextUrl]);
  const directStepItems: Array<{ key: Exclude<DirectOnboardingStep, 'success'>; label: string }> = [
    { key: 'identity', label: 'Identidad' },
    { key: 'person', label: 'Usuario' },
    { key: 'company', label: 'Empresa' },
    { key: 'api', label: 'API key' },
  ];
  const directStepIndex = showIdentityGate
    ? 0
    : directStep === 'person'
      ? 1
      : directStep === 'company'
        ? 2
        : directStep === 'api'
          ? 3
          : 4;

  const loadStatus = useCallback(
    async (signal?: AbortSignal) => {
      const effectiveTenantIdHint = selectedTenantId ?? initialTenantIdHint;
      const res = await fetch(`/api/integrations/accounting/status?channel=${entryChannel}`, {
        cache: 'no-store',
        signal,
        headers: {
          'x-isaak-entry-channel': entryChannel,
          ...(activeOnboardingToken ? { 'x-holded-onboarding-token': activeOnboardingToken } : {}),
          ...(effectiveTenantIdHint ? { 'x-isaak-tenant-id': effectiveTenantIdHint } : {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || uiCopy.errorLoadFailed);
      return data as IntegrationStatus;
    },
    [
      activeOnboardingToken,
      entryChannel,
      initialTenantIdHint,
      selectedTenantId,
      uiCopy.errorLoadFailed,
    ]
  );

  const statusLabel = useMemo(() => {
    if (showIdentityGate) return 'Pendiente de verificar identidad';
    if (needsPostValidationCompanyStep && !apiValidated) return 'Pendiente de validar API key';
    if (showCompanyForm) return 'Pendiente de datos de empresa';
    if (!companyConfirmed) return 'Pendiente de confirmar empresa';
    if (status?.connected) return uiCopy.statusConnected;
    if (redirecting) return 'Llevandote de vuelta al chat';
    if (loading) return uiCopy.statusLoading;
    return uiCopy.statusPending;
  }, [
    apiValidated,
    companyConfirmed,
    loading,
    needsPostValidationCompanyStep,
    redirecting,
    showIdentityGate,
    showCompanyForm,
    status?.connected,
    uiCopy.statusConnected,
    uiCopy.statusLoading,
    uiCopy.statusPending,
  ]);

  const goToNextStep = useCallback(
    (target = nextUrl) => {
      if (!target) return;
      setRedirecting(true);
      setRedirectTarget(target);
      if (!captureMode) {
        window.location.replace(target);
      }
    },
    [captureMode, nextUrl]
  );

  const applySummaryToCompanyForm = useCallback((nextSummary: HoldedOnboardingSummary) => {
    const nextDraft = createCompanyDraftFromSummary(nextSummary);

    setCompanyLegalName(nextDraft.companyLegalName);
    setCompanyTaxId(nextDraft.companyTaxId);
    setCompanyAddress(nextDraft.companyAddress);
    setCompanyPostalCode(nextDraft.companyPostalCode);
    setCompanyCity(nextDraft.companyCity);
    setCompanyProvince(nextDraft.companyProvince);
    setCompanyCountry(nextDraft.companyCountry);
    setCompanyWebsite(nextDraft.companyWebsite);
    setCompanySectorCode(nextDraft.companySectorCode);
    setContactFirstName(nextDraft.contactFirstName);
    setContactLastName(nextDraft.contactLastName);
    setContactRole(nextDraft.contactRole);
    setContactEmail(nextDraft.contactEmail);
    setContactPhone(nextDraft.contactPhone);
  }, []);

  const resetForFreshApiValidation = useCallback(() => {
    setResolvedSummary(freshValidationSummary);
    applySummaryToCompanyForm(freshValidationSummary);
    setShowCompanyForm(false);
  }, [applySummaryToCompanyForm, freshValidationSummary]);

  const returnToApiStep = useCallback(() => {
    setApiValidated(false);
    setCompanyConfirmed(false);
    setCompanyError(null);
    setCompanyMessage(null);
    setMessage(null);
    setError(null);
    setValidationToken(null);
    setValidatedApiKey('');
    setSelectedTenantId(null);
    resetForFreshApiValidation();
  }, [resetForFreshApiValidation]);

  const goToDirectStep = useCallback((step: DirectOnboardingStep) => {
    setError(null);
    setMessage(null);
    setDirectStep(step);
  }, []);

  const shouldCheckExistingConnectionStatus =
    !showIdentityGate &&
    !companyStepPending &&
    (!needsPostValidationCompanyStep || confirmationModeNeedsExistingConnectionCheck);

  const handleDirectNextFromPerson = useCallback(() => {
    if (!verifiedIdentityReady) {
      setError('Primero confirma tu identidad con Google o verifica el correo que quieres usar.');
      return;
    }

    if (!canContinuePersonStep) {
      setError('Necesitamos nombre, apellidos y rol para continuar.');
      return;
    }

    goToDirectStep('company');
  }, [canContinuePersonStep, goToDirectStep, verifiedIdentityReady]);

  const handleDirectNextFromCompany = useCallback(() => {
    if (!canContinueCompanyStep) {
      setError('Necesitamos razon social, CIF/NIF, domicilio y sector para continuar.');
      return;
    }

    goToDirectStep('api');
  }, [canContinueCompanyStep, goToDirectStep]);

  const handleHeaderBack = useCallback(() => {
    if (usesDirectStepFlow && !redirecting) {
      if (directStep === 'company') {
        goToDirectStep('person');
        return;
      }

      if (directStep === 'person' && requiresVerifiedIdentity) {
        goToDirectStep('identity');
        return;
      }

      if (directStep === 'api') {
        goToDirectStep('company');
        return;
      }

      if (directStep === 'success') {
        goToDirectStep('api');
        return;
      }
    }

    if (companyStepPending) {
      returnToApiStep();
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(isChatgptEntry ? CHATGPT_HOME_URL : nextUrl || HOLDED_COMPAT_URL);
  }, [
    companyStepPending,
    directStep,
    goToDirectStep,
    isChatgptEntry,
    nextUrl,
    requiresVerifiedIdentity,
    redirecting,
    returnToApiStep,
    usesDirectStepFlow,
  ]);

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
    if (!shouldCheckExistingConnectionStatus) {
      setLoading(false);
      return;
    }

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
          if (confirmationModeNeedsExistingConnectionCheck) {
            goToNextStep(confirmedNextUrl);
            return;
          }

          if (!requireConnectionConfirmation) {
            goToNextStep();
          }
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
  }, [
    companyStepPending,
    confirmationModeNeedsExistingConnectionCheck,
    confirmedNextUrl,
    goToNextStep,
    loadStatus,
    needsPostValidationCompanyStep,
    nextUrl,
    requireConnectionConfirmation,
    showIdentityGate,
    shouldCheckExistingConnectionStatus,
    uiCopy.errorLoadFailed,
  ]);

  const handleRetryStatus = async () => {
    if (!shouldCheckExistingConnectionStatus) return;

    setLoading(true);
    setError(null);
    try {
      const data = await loadStatus();
      setStatus(data);
      if (data?.connected && nextUrl) {
        if (confirmationModeNeedsExistingConnectionCheck) {
          goToNextStep(confirmedNextUrl);
          return;
        }

        if (!requireConnectionConfirmation) {
          goToNextStep();
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : uiCopy.errorLoadFailed);
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async (
    requestTenantIdHint?: string | null,
    onboardingTokenHint?: string | null
  ) => {
    const effectiveTenantIdHint = requestTenantIdHint ?? selectedTenantId ?? initialTenantIdHint;
    const effectiveOnboardingToken =
      onboardingTokenHint === undefined ? activeOnboardingToken : onboardingTokenHint;
    const res = await fetch('/api/integrations/accounting/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-isaak-entry-channel': entryChannel,
        ...(effectiveTenantIdHint ? { 'x-isaak-tenant-id': effectiveTenantIdHint } : {}),
        ...(effectiveOnboardingToken
          ? { 'x-holded-onboarding-token': effectiveOnboardingToken }
          : {}),
      },
      body: JSON.stringify({
        apiKey: normalizedApiKey,
        acceptedTerms,
        acceptedPrivacy,
      }),
    });
    const data = (await res.json().catch(() => null)) as ValidationResponse | null;
    if (!res.ok) {
      setValidationToken(null);
      setValidatedApiKey('');
      throw new Error(
        data?.debug ||
          data?.detail ||
          data?.error ||
          `Error HTTP ${res.status} al validar la API key de Holded`
      );
    }
    if (!data?.ok) {
      setValidationToken(null);
      setValidatedApiKey('');
      throw new Error(
        data?.probe?.error || 'No hemos podido validar tu acceso con el ERP compatible'
      );
    }

    setValidationToken(data?.validationToken || null);
    setValidatedApiKey(normalizedApiKey);
    return data;
  };

  const connectValidatedApi = async (
    requestTenantIdHint?: string | null,
    validationTokenHint?: string | null,
    onboardingTokenHint?: string | null
  ) => {
    const effectiveTenantIdHint = requestTenantIdHint ?? selectedTenantId ?? initialTenantIdHint;
    const effectiveOnboardingToken =
      onboardingTokenHint === undefined ? activeOnboardingToken : onboardingTokenHint;
    const res = await fetch('/api/integrations/accounting/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-isaak-entry-channel': entryChannel,
        ...(effectiveTenantIdHint ? { 'x-isaak-tenant-id': effectiveTenantIdHint } : {}),
        ...(effectiveOnboardingToken
          ? { 'x-holded-onboarding-token': effectiveOnboardingToken }
          : {}),
      },
      body: JSON.stringify({
        apiKey: normalizedApiKey,
        acceptedTerms,
        acceptedPrivacy,
        validationToken:
          validationTokenHint ?? (hasReusableValidationToken ? validationToken : undefined),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        data?.debug ||
          data?.detail ||
          data?.error ||
          `Error HTTP ${res.status} al activar ${isChatgptEntry ? 'la conexion' : 'Holded'}`
      );
    }
    if (!data?.ok) {
      throw new Error(
        data?.probe?.error ||
          data?.lastError ||
          'No hemos podido validar tu acceso con el ERP compatible'
      );
    }

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

    return data;
  };

  const prepareTenantForConnection = async () => {
    const normalizedLegalName = normalizeText(companyLegalName);
    const normalizedCompanyName = normalizedLegalName;
    const normalizedTaxId = normalizeText(companyTaxId).toUpperCase();
    const normalizedCompanyAddress = normalizeText(companyAddress);
    const normalizedCompanyPostalCode = normalizeText(companyPostalCode);
    const normalizedCompanyCity = normalizeText(companyCity);
    const normalizedCompanyProvince = normalizeText(companyProvince);
    const normalizedCompanyCountry = normalizeText(companyCountry);
    const normalizedCompanyWebsite = normalizeText(companyWebsite);
    const normalizedCompanySectorCode = normalizeText(companySectorCode);
    const normalizedCompanySectorLabel =
      CNAE_SECTION_OPTIONS.find((option) => option.value === normalizedCompanySectorCode)?.label ||
      null;
    const normalizedContactFirstName = normalizeText(contactFirstName);
    const normalizedContactLastName = normalizeText(contactLastName);
    const normalizedContactRole = normalizeText(contactRole);
    const normalizedContactName = buildFullName({
      firstName: normalizedContactFirstName,
      lastName: normalizedContactLastName,
    });
    const normalizedContactEmail = stepContactEmail;
    const normalizedContactPhone = normalizeText(contactPhone);

    if (
      !normalizedCompanyName ||
      !normalizedTaxId ||
      !normalizedCompanyAddress ||
      !normalizedCompanyPostalCode ||
      !normalizedCompanyCity ||
      !normalizedCompanyProvince ||
      !normalizedCompanyCountry ||
      !normalizedCompanySectorCode ||
      !normalizedContactFirstName ||
      !normalizedContactLastName ||
      !normalizedContactRole ||
      !normalizedContactEmail
    ) {
      throw new Error(
        'Necesitamos nombre de empresa, NIF/CIF, domicilio, sector, nombre, apellidos, rol y correo para continuar.'
      );
    }

    const createRes = await fetch('/api/onboarding/tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(activeOnboardingToken ? { 'x-holded-onboarding-token': activeOnboardingToken } : {}),
      },
      body: JSON.stringify({
        reuseCurrentTenant: true,
        source: 'manual',
        name: normalizedCompanyName,
        legalName: normalizedLegalName,
        nif: normalizedTaxId,
        country: normalizedCompanyCountry,
        extra: {
          cnae: normalizedCompanySectorLabel
            ? `${normalizedCompanySectorCode} - ${normalizedCompanySectorLabel}`
            : normalizedCompanySectorCode,
          cnaeCode: normalizedCompanySectorCode,
          cnaeText: normalizedCompanySectorLabel || undefined,
          website: normalizedCompanyWebsite || undefined,
          address: normalizedCompanyAddress,
          postalCode: normalizedCompanyPostalCode,
          city: normalizedCompanyCity,
          province: normalizedCompanyProvince,
          country: normalizedCompanyCountry,
          fiscalAddress: {
            address: normalizedCompanyAddress,
            postalCode: normalizedCompanyPostalCode,
            city: normalizedCompanyCity,
            province: normalizedCompanyProvince,
            country: normalizedCompanyCountry,
          },
          representative: normalizedContactName,
          representativeRole: normalizedContactRole,
          contactFirstName: normalizedContactFirstName,
          contactLastName: normalizedContactLastName,
          email: normalizedContactEmail,
          phone: normalizedContactPhone || undefined,
        },
      }),
    });
    const createData = (await createRes.json().catch(() => null)) as TenantCreateResponse | null;

    if (createData?.action === 'REQUEST_ACCESS') {
      throw new Error('Esta empresa ya existe, pero tu usuario no tiene acceso a ella.');
    }

    if (!createRes.ok || !createData?.ok) {
      throw new Error(createData?.error || 'No hemos podido preparar la empresa para continuar.');
    }

    const nextTenantId = typeof createData?.tenantId === 'string' ? createData.tenantId.trim() : '';
    if (!nextTenantId) {
      throw new Error('La empresa se ha creado, pero no hemos podido activarla en tu sesion.');
    }

    const nextOnboardingToken =
      typeof createData?.onboardingToken === 'string' && createData.onboardingToken.trim()
        ? createData.onboardingToken.trim()
        : null;

    setSelectedTenantId(nextTenantId);
    setActiveOnboardingToken(nextOnboardingToken);

    if (!nextOnboardingToken) {
      const switchRes = await fetch('/api/session/tenant-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: nextTenantId }),
      });
      const switchData = await switchRes.json().catch(() => null);

      if (!switchRes.ok || !switchData?.ok) {
        throw new Error(
          switchData?.error || 'No hemos podido activar la empresa nueva en esta sesion.'
        );
      }
    }

    const nextLegalName =
      normalizedLegalName.toLowerCase() === normalizedCompanyName.toLowerCase()
        ? null
        : normalizedLegalName;
    setResolvedSummary({
      companyName: normalizedCompanyName,
      companyLegalName: nextLegalName,
      companyTaxId: normalizedTaxId,
      companyAddress: normalizedCompanyAddress,
      companyPostalCode: normalizedCompanyPostalCode,
      companyCity: normalizedCompanyCity,
      companyProvince: normalizedCompanyProvince,
      companyCountry: normalizedCompanyCountry,
      companyWebsite: normalizedCompanyWebsite || null,
      companySectorCode: normalizedCompanySectorCode,
      companySectorLabel: normalizedCompanySectorLabel,
      contactFirstName: normalizedContactFirstName,
      contactRole: normalizedContactRole,
      contactFullName: normalizedContactName,
      contactEmail: normalizedContactEmail,
      companyEmail: normalizedContactEmail,
      contactPhone: normalizedContactPhone || null,
    });

    return {
      tenantId: nextTenantId,
      onboardingToken: nextOnboardingToken,
    };
  };

  const createTenantAndConnect = async (validationTokenHint?: string | null) => {
    const preparedTenant = await prepareTenantForConnection();

    await connectValidatedApi(
      preparedTenant.tenantId,
      validationTokenHint,
      preparedTenant.onboardingToken
    );

    return preparedTenant;
  };

  const handleCompanySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCompanySaving(true);
    setCompanyError(null);
    setCompanyMessage(null);

    try {
      const createdTenant = await createTenantAndConnect();

      setCompanyConfirmed(true);
      setShowCompanyForm(false);
      setCompanyMessage('Datos confirmados. Ya estamos terminando la conexion con Holded.');
      setError(null);
      setMessage(uiCopy.successConnected);
      goToNextStep(
        resolveConfirmedNextUrl({
          onboardingToken: createdTenant.onboardingToken,
          tenantIdHint: createdTenant.tenantId,
        })
      );
    } catch (submitError) {
      setCompanyError(
        submitError instanceof Error
          ? submitError.message
          : 'No hemos podido guardar la empresa y el contacto.'
      );
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (showIdentityGate) {
      setError('Debes verificar tu identidad antes de continuar.');
      return;
    }
    if (!normalizedApiKey) {
      setError(uiCopy.errorApiKeyEmpty);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    setCompanyError(null);

    try {
      if (needsPostValidationCompanyStep && !apiValidated) {
        const validation = await validateApiKey();
        if (hasResolvedCompanyProfile) {
          setResolvedSummary(summary);
          applySummaryToCompanyForm(summary);
          await connectValidatedApi(undefined, validation?.validationToken || null);
          setApiValidated(true);
          setShowCompanyForm(false);
          setCompanyConfirmed(true);
          setCompanyMessage(null);
          setMessage(uiCopy.successConnected);
          goToNextStep(confirmedNextUrl);
        } else if (usesInlineDirectForm) {
          const createdTenant = await createTenantAndConnect(validation?.validationToken || null);
          setCompanyConfirmed(true);
          setShowCompanyForm(false);
          setCompanyMessage(null);
          setMessage(uiCopy.successConnected);
          goToNextStep(
            resolveConfirmedNextUrl({
              onboardingToken: createdTenant.onboardingToken,
              tenantIdHint: createdTenant.tenantId,
            })
          );
        } else {
          resetForFreshApiValidation();
          setApiValidated(true);
          setShowCompanyForm(true);
          setCompanyConfirmed(false);
          setCompanyMessage(
            'API key validada. Hemos limpiado los datos anteriores para que confirmes solo la empresa de esta nueva conexion.'
          );
          return;
        }
        return;
      }

      if (companyStepPending) {
        setError('Primero confirma la empresa con la que quieres continuar.');
        return;
      }

      await connectValidatedApi();
      setMessage(uiCopy.successConnected);
      goToNextStep(confirmedNextUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : uiCopy.errorConnectFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleContinueWithGoogle = async () => {
    const requestOnboardingToken = resolveRequestOnboardingToken();
    if (!requestOnboardingToken) {
      restartIdentityFlow();
      return;
    }

    setIdentitySubmitting(true);
    setIdentityError(null);
    setIdentityMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const response = await fetch('/api/onboarding/identity/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-holded-onboarding-token': requestOnboardingToken,
        },
        body: JSON.stringify({
          idToken,
          onboardingToken: requestOnboardingToken,
          tenantIdHint: selectedTenantId ?? initialTenantIdHint,
        }),
      });
      const data = (await response.json().catch(() => null)) as IdentityResponse | null;

      if (
        !response.ok &&
        isMissingOnboardingSessionError({ status: response.status, error: data?.error })
      ) {
        restartIdentityFlow();
        return;
      }

      if (!response.ok || !data?.ok || !data.identity?.email) {
        throw new Error(
          data?.detail || data?.error || 'No hemos podido verificar tu identidad con Google.'
        );
      }

      const nextIdentity: OnboardingIdentityState = {
        authMethod: data.identity.authMethod ?? 'google',
        email: data.identity.email ?? null,
        emailVerified: data.identity.emailVerified === true,
        firstName: data.identity.firstName ?? null,
        lastName: data.identity.lastName ?? null,
        verifiedAt: data.identity.verifiedAt ?? null,
      };

      setIdentityState(nextIdentity);
      setManualEmail(data.identity.email || '');
      setContactEmail(data.identity.email || '');
      if (data.onboardingToken) {
        setActiveOnboardingToken(data.onboardingToken);
      }
      setIdentityMessage('Identidad confirmada con Google. Ya puedes continuar con la API key.');
    } catch (identityRequestError) {
      setIdentityError(getGoogleIdentityErrorMessage(identityRequestError));
    } finally {
      await signOut(auth).catch(() => undefined);
      setIdentitySubmitting(false);
    }
  };

  const handleSendVerificationEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requestOnboardingToken = resolveRequestOnboardingToken();
    if (!requestOnboardingToken) {
      restartIdentityFlow();
      return;
    }

    const normalizedEmail = normalizeText(manualEmail).toLowerCase();
    if (!normalizedEmail) {
      setIdentityError('Necesitamos un correo para enviarte el enlace de verificacion.');
      return;
    }

    setIdentitySubmitting(true);
    setIdentityError(null);
    setIdentityMessage(null);

    try {
      const response = await fetch('/api/onboarding/identity/email/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-holded-onboarding-token': requestOnboardingToken,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          onboardingToken: requestOnboardingToken,
          returnUrl: window.location.href,
          tenantIdHint: selectedTenantId ?? initialTenantIdHint,
        }),
      });
      const data = (await response.json().catch(() => null)) as IdentityResponse | null;

      if (
        !response.ok &&
        isMissingOnboardingSessionError({ status: response.status, error: data?.error })
      ) {
        restartIdentityFlow();
        return;
      }

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.detail || data?.error || 'No hemos podido enviar el correo de verificacion.'
        );
      }

      const nextIdentity: OnboardingIdentityState = {
        authMethod: data.identity?.authMethod ?? 'email',
        email: data.identity?.email ?? normalizedEmail,
        emailVerified: data.identity?.emailVerified === true,
        firstName: data.identity?.firstName ?? null,
        lastName: data.identity?.lastName ?? null,
        verifiedAt: data.identity?.verifiedAt ?? null,
      };

      setIdentityState((current) => ({
        ...current,
        ...nextIdentity,
      }));
      if (data.onboardingToken) {
        setActiveOnboardingToken(data.onboardingToken);
      }
      setManualEmail(data.identity?.email ?? normalizedEmail);
      setContactEmail(data.identity?.email ?? normalizedEmail);

      if (nextIdentity.emailVerified) {
        setIdentityMessage(
          data.alreadyVerified
            ? 'Este correo ya estaba confirmado. Ya puedes continuar con el paso Usuario.'
            : `Correo confirmado para ${nextIdentity.email}. Ya puedes continuar con el paso Usuario.`
        );

        if (usesDirectStepFlow) {
          setDirectStep((current) => (current === 'identity' ? 'person' : current));
        }
        return;
      }

      setIdentityMessage(
        'Te hemos enviado un enlace de verificacion. Abre ese correo y volveras aqui con la identidad confirmada.'
      );
    } catch (identityRequestError) {
      setIdentityError(
        identityRequestError instanceof Error
          ? identityRequestError.message
          : 'No hemos podido enviar el correo de verificacion.'
      );
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const handleDirectApiSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (showIdentityGate) {
      setError('Debes verificar tu identidad antes de continuar.');
      return;
    }

    if (!canContinuePersonStep) {
      goToDirectStep('person');
      setError('Necesitamos nombre y apellidos para continuar.');
      return;
    }

    if (!canContinueCompanyStep) {
      goToDirectStep('company');
      setError('Necesitamos empresa y CIF/NIF para continuar.');
      return;
    }

    if (!normalizedApiKey) {
      setError(uiCopy.errorApiKeyEmpty);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const preparedTenant = await prepareTenantForConnection();
      const validation = await validateApiKey(
        preparedTenant.tenantId,
        preparedTenant.onboardingToken
      );

      await connectValidatedApi(
        preparedTenant.tenantId,
        validation?.validationToken || null,
        preparedTenant.onboardingToken
      );

      setMessage(uiCopy.successConnected);
      setDirectStep('success');
      goToNextStep(
        resolveConfirmedNextUrl({
          onboardingToken: preparedTenant.onboardingToken,
          tenantIdHint: preparedTenant.tenantId,
        })
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : uiCopy.errorConnectFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_45%,#ffffff_100%)] px-3 py-4 text-black sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-2xl xl:max-w-3xl">
        <div className="rounded-[28px] border border-neutral-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.09)]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <button
              type="button"
              onClick={handleHeaderBack}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </button>
            <button
              type="button"
              onClick={handleHeaderBack}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {uiCopy.eyebrow}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d9e6ff] bg-[#f7fbff] px-3 py-1.5 text-xs font-semibold text-[#0b214a]">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={16}
                height={16}
                className="h-4 w-4"
              />
              Compatible con Holded
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-[1.8rem]">
              {uiCopy.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-700 sm:text-base">
              {showIdentityGate ? 'Confirma tu identidad para continuar.' : uiCopy.intro}
            </p>
            {!showIdentityGate ? (
              <>
                <p className="mt-2 text-sm font-medium text-[#0b214a]">{personalizedLead}</p>

                <div className="mt-5 rounded-2xl border border-[#0b6cfb]/20 bg-[#f3f8ff] px-4 py-3 text-sm text-[#0b214a]">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0b6cfb]" />
                    <span>{uiCopy.security}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {uiHighlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {usesDirectStepFlow ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {directStepItems.map((step, index) => {
                    const active = directStepIndex === index;
                    const completed = directStepIndex > index;

                    return (
                      <div
                        key={step.key}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? 'border-[#0b6cfb] bg-[#f3f8ff] text-[#0b214a]'
                            : completed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                              : 'border-neutral-200 bg-white text-neutral-500'
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                            active
                              ? 'bg-[#0b6cfb] text-white'
                              : completed
                                ? 'bg-emerald-700 text-white'
                                : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {completed ? '✓' : index + 1}
                        </span>
                        {step.label}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  {!showIdentityGate && identityMessage ? (
                    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{identityMessage}</span>
                    </div>
                  ) : null}

                  {showIdentityGate ? (
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d9e6ff] bg-white shadow-sm">
                          <ShieldCheck className="h-5 w-5 text-[#0b6cfb]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-black">
                            Paso 1: confirma tu identidad
                          </div>
                          <p className="mt-2 text-sm leading-6 text-neutral-700">
                            Elige una opcion para continuar. El correo tiene que ser el mismo que
                            tienes configurado en Holded.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleContinueWithGoogle}
                          disabled={identitySubmitting || !activeOnboardingToken}
                          className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-left text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <GoogleMark />
                          Continuar con Google
                        </button>

                        <form
                          onSubmit={handleSendVerificationEmail}
                          className="rounded-2xl border border-neutral-300 bg-white p-3 shadow-sm"
                        >
                          <div className="text-sm font-semibold text-black">Confirmar correo</div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Correo electronico
                            <input
                              type="email"
                              value={manualEmail}
                              onChange={(event) => setManualEmail(event.target.value)}
                              placeholder="tu@empresa.com"
                              autoComplete="email"
                              className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={
                              identitySubmitting ||
                              !normalizeText(manualEmail) ||
                              !activeOnboardingToken
                            }
                            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {identityState.authMethod === 'email' &&
                            identityState.email === normalizeText(manualEmail).toLowerCase()
                              ? 'Reenviar correo de confirmacion'
                              : 'Confirmar correo'}
                          </button>
                        </form>
                      </div>

                      {identityState.authMethod === 'email' && identityState.email ? (
                        <div className="mt-4 rounded-2xl border border-[#d9e6ff] bg-[#f7fbff] px-4 py-3 text-sm text-[#0b214a]">
                          Hemos dejado preparado el correo <strong>{identityState.email}</strong>.
                          En cuanto abras el enlace de verificacion, volveras a este flujo y se
                          desbloqueara el siguiente paso.
                        </div>
                      ) : null}

                      {identityMessage ? (
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{identityMessage}</span>
                        </div>
                      ) : null}

                      {identityError ? (
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{identityError}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : directStep === 'person' ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleDirectNextFromPerson();
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-black">Paso 2: usuario</div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          Queremos dejar listos los datos del usuario que actuara dentro de la
                          empresa conectada a Holded.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-neutral-700">
                          Nombre
                          <input
                            type="text"
                            value={contactFirstName}
                            onChange={(event) => setContactFirstName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Nombre"
                            autoComplete="given-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Apellidos
                          <input
                            type="text"
                            value={contactLastName}
                            onChange={(event) => setContactLastName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Apellidos"
                            autoComplete="family-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Rol en la empresa
                          <select
                            value={contactRole}
                            onChange={(event) => setContactRole(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                          >
                            <option value="">Selecciona tu rol</option>
                            {COMPANY_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-neutral-700 sm:col-span-2">
                          Telefono
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(event) => setContactPhone(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="600 000 000"
                            autoComplete="tel"
                          />
                        </label>
                      </div>

                      <div className="rounded-2xl border border-[#d9e6ff] bg-[#f7fbff] px-4 py-3 text-sm text-[#0b214a]">
                        Correo verificado: <strong>{stepContactEmail || 'pendiente'}</strong>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {requiresVerifiedIdentity ? (
                          <button
                            type="button"
                            onClick={() => goToDirectStep('identity')}
                            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                          >
                            Cambiar correo o Google
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          disabled={!canContinuePersonStep || !verifiedIdentityReady}
                          className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Continuar con empresa
                        </button>
                      </div>
                    </form>
                  ) : directStep === 'company' ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleDirectNextFromCompany();
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-black">
                          Paso 3: datos de empresa
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          Antes de tocar la API key, necesitamos los datos fiscales y el sector base
                          de la empresa que vas a conectar.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-neutral-700 sm:col-span-2">
                          Razon social
                          <input
                            type="text"
                            value={companyLegalName}
                            onChange={(event) => setCompanyLegalName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Tu empresa, S.L."
                            autoComplete="organization"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          CIF / NIF
                          <input
                            type="text"
                            value={companyTaxId}
                            onChange={(event) => setCompanyTaxId(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="B12345678"
                            autoComplete="off"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Sector (CNAE base)
                          <select
                            value={companySectorCode}
                            onChange={(event) => setCompanySectorCode(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                          >
                            <option value="">Selecciona el sector principal</option>
                            {CNAE_SECTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.value} - {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-neutral-700 sm:col-span-2">
                          Domicilio
                          <input
                            type="text"
                            value={companyAddress}
                            onChange={(event) => setCompanyAddress(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Calle, numero, nave o local"
                            autoComplete="street-address"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Codigo postal
                          <input
                            type="text"
                            value={companyPostalCode}
                            onChange={(event) => setCompanyPostalCode(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="28001"
                            autoComplete="postal-code"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Ciudad
                          <input
                            type="text"
                            value={companyCity}
                            onChange={(event) => setCompanyCity(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Madrid"
                            autoComplete="address-level2"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Provincia
                          <input
                            type="text"
                            value={companyProvince}
                            onChange={(event) => setCompanyProvince(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Madrid"
                            autoComplete="address-level1"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Pais
                          <input
                            type="text"
                            value={companyCountry}
                            onChange={(event) => setCompanyCountry(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Espana"
                            autoComplete="country-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700 sm:col-span-2">
                          Pagina web (opcional)
                          <input
                            type="url"
                            value={companyWebsite}
                            onChange={(event) => setCompanyWebsite(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="https://tuempresa.com"
                            autoComplete="url"
                          />
                        </label>
                      </div>

                      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
                        Esta empresa quedara asociada a{' '}
                        <strong>{currentDirectFullName || 'tu perfil'}</strong> con el correo{' '}
                        <strong>{stepContactEmail || 'pendiente'}</strong> y el rol{' '}
                        <strong>{currentDirectRoleLabel}</strong>.
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => goToDirectStep('person')}
                          className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                        >
                          Volver
                        </button>
                        <button
                          type="submit"
                          disabled={!canContinueCompanyStep}
                          className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Continuar con API key
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleDirectApiSubmit} className="space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-black">
                          Paso 4: conecta Holded
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          Ya tenemos la identidad y la empresa. Solo falta validar una API key
                          activa de Holded para cerrar la conexion y volver a ChatGPT.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                            Usuario
                          </div>
                          <div className="mt-1 text-sm font-semibold text-black">
                            {currentDirectFullName || 'Pendiente'}
                          </div>
                          <div className="mt-2 break-all text-sm text-neutral-700">
                            {stepContactEmail || 'Sin correo'}
                          </div>
                          <div className="mt-2 text-sm text-neutral-700">
                            {currentDirectRoleLabel}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                            Empresa
                          </div>
                          <div className="mt-1 text-sm font-semibold text-black">
                            {currentDirectCompanyName || 'Pendiente'}
                          </div>
                          <div className="mt-2 text-sm text-neutral-700">
                            {normalizeText(companyTaxId) || 'Sin CIF/NIF'}
                          </div>
                          <div className="mt-2 text-sm text-neutral-700">
                            {currentDirectCompanySector}
                          </div>
                          <div className="mt-2 text-sm text-neutral-700">
                            {currentDirectCompanyAddress}
                          </div>
                        </div>
                      </div>

                      <a
                        href={HOLDED_API_GUIDE_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-center gap-3 rounded-2xl border border-[#ff5460]/20 bg-[linear-gradient(135deg,#fff6f7_0%,#ffffff_100%)] px-4 py-4 text-left transition hover:border-[#ff5460]/40 hover:bg-[#fff7f8]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                          <Image
                            src="/brand/holded/holded-diamond-logo.png"
                            alt="Holded"
                            width={20}
                            height={20}
                            className="h-5 w-5"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff5460]">
                            Guia oficial
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-[#7a1f2a] underline decoration-[#ff5460]/40 underline-offset-4 group-hover:decoration-[#ff5460]">
                            Ver guia oficial de Holded para generar la API key
                          </span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-[#ff5460]" />
                      </a>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-black">
                          {uiCopy.apiKeyLabel}
                        </span>
                        <span className="mb-3 block text-sm text-neutral-600">
                          {uiCopy.apiKeyHelp}
                        </span>
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(event) => {
                              setApiKey(event.target.value);
                              setValidationToken(null);
                              setValidatedApiKey('');
                            }}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={uiCopy.apiKeyPlaceholder}
                            className="h-12 w-full rounded-2xl border border-neutral-300 bg-white pl-11 pr-4 text-sm text-black outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                          />
                        </div>
                      </label>

                      <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          Al conectar aceptas los{' '}
                          <a
                            href={VERIFACTU_TERMS_URL}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                          >
                            Terminos
                          </a>{' '}
                          y la{' '}
                          <a
                            href={VERIFACTU_PRIVACY_URL}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                          >
                            Politica de Privacidad
                          </a>{' '}
                          de verifactu.business.
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => goToDirectStep('company')}
                          className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                        >
                          Volver
                        </button>
                        <button
                          type="submit"
                          disabled={saving || !normalizedApiKey}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {submitLabel}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {redirecting ? (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_52%,#f7fbff_100%)] p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:items-center">
                      <HoldedStatusVisual eyebrow="Conexion lista" title="Ultimo paso" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                          Ultimo paso
                        </div>
                        <div className="mt-2 text-base font-semibold text-black">
                          {uiCopy.redirectTitle}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          {redirectDescription}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <a
                            href={redirectTarget}
                            className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                          >
                            Continuar
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  {companyStepPending ? (
                    <div>
                      <div className="text-sm font-semibold text-black">
                        Datos de empresa y contacto
                      </div>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {reusesStoredCompanyData
                          ? 'La API key ya es valida. Revisa solo los datos minimos de empresa y contacto antes de terminar la conexion.'
                          : 'La API key ya es valida. Ahora necesitamos guardar los datos minimos de empresa y contacto para dejar la conexion cerrada correctamente.'}
                      </p>

                      <form
                        onSubmit={handleCompanySubmit}
                        className="mt-4 grid gap-4 sm:grid-cols-2"
                      >
                        <label className="block text-sm font-medium text-neutral-700">
                          Razon social
                          <input
                            type="text"
                            value={companyLegalName}
                            onChange={(event) => setCompanyLegalName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Tu empresa, S.L."
                            autoComplete="organization"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          NIF / CIF
                          <input
                            type="text"
                            value={companyTaxId}
                            onChange={(event) => setCompanyTaxId(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="B12345678"
                            autoComplete="off"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Nombre
                          <input
                            type="text"
                            value={contactFirstName}
                            onChange={(event) => setContactFirstName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Nombre"
                            autoComplete="given-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Apellidos
                          <input
                            type="text"
                            value={contactLastName}
                            onChange={(event) => setContactLastName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Apellidos"
                            autoComplete="family-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Correo principal en Holded
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(event) => setContactEmail(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="nombre@empresa.com"
                            autoComplete="email"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Telefono
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(event) => setContactPhone(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="600 000 000"
                            autoComplete="tel"
                          />
                        </label>
                        <div className="sm:col-span-2 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={returnToApiStep}
                            disabled={companySaving}
                            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Volver a la API key
                          </button>
                          <button
                            type="submit"
                            disabled={companySaving}
                            className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {companySaving ? 'Guardando...' : 'Guardar datos y terminar conexion'}
                          </button>
                        </div>
                      </form>

                      {companyMessage ? (
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{companyMessage}</span>
                        </div>
                      ) : null}

                      {companyError ? (
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{companyError}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : hideResolvedCompanyUntilApiValidation ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d9e6ff] bg-white shadow-sm">
                        <Image
                          src="/brand/holded/holded-diamond-logo.png"
                          alt="Holded"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-black">
                          {usesInlineDirectForm
                            ? 'Formulario directo del conector'
                            : 'Primero valida tu API key'}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          {usesInlineDirectForm
                            ? 'Completa tus datos y la API key de Holded en este mismo formulario. Validaremos la conexion y prepararemos la empresa internamente sin mostrarte login ni registro.'
                            : 'Antes de mostrar o confirmar ninguna empresa, necesitamos comprobar que la API key corresponde a una conexion real y utilizable de Holded.'}
                        </p>
                        <div className="mt-3 text-sm text-neutral-700">
                          Estado: <span className="font-semibold text-black">{statusLabel}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d9e6ff] bg-white shadow-sm">
                        <Image
                          src="/brand/holded/holded-diamond-logo.png"
                          alt="Holded"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-black">{uiCopy.statusReady}</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                              Empresa
                            </div>
                            <div className="mt-1 text-sm font-semibold text-black">
                              {resolvedSummary.companyName}
                            </div>
                          </div>
                          {showCompanyLegalName ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Razon social
                              </div>
                              <div className="mt-1 text-sm text-neutral-700">
                                {resolvedSummary.companyLegalName}
                              </div>
                            </div>
                          ) : null}
                          {resolvedSummary.companyTaxId ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                NIF / CIF
                              </div>
                              <div className="mt-1 text-sm text-neutral-700">
                                {resolvedSummary.companyTaxId}
                              </div>
                            </div>
                          ) : null}
                          {resolvedSummary.contactFullName ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Persona de contacto
                              </div>
                              <div className="mt-1 text-sm text-neutral-700">
                                {resolvedSummary.contactFullName}
                              </div>
                            </div>
                          ) : null}
                          {resolvedSummary.contactEmail ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Correo de acceso
                              </div>
                              <div className="mt-1 break-all text-sm text-neutral-700">
                                {resolvedSummary.contactEmail}
                              </div>
                            </div>
                          ) : null}
                          {showCompanyEmail ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Correo de empresa
                              </div>
                              <div className="mt-1 break-all text-sm text-neutral-700">
                                {resolvedSummary.companyEmail}
                              </div>
                            </div>
                          ) : null}
                          {resolvedSummary.contactPhone ? (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Telefono
                              </div>
                              <div className="mt-1 text-sm text-neutral-700">
                                {resolvedSummary.contactPhone}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3 text-sm text-neutral-700">
                          Estado: <span className="font-semibold text-black">{statusLabel}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!companyStepPending && status?.degraded ? (
                    <div className="mt-2 text-sm text-amber-700">{uiCopy.degraded}</div>
                  ) : null}
                </div>

                {!needsPostValidationCompanyStep &&
                !companyStepPending &&
                loading &&
                !saving &&
                !redirecting ? (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_52%,#fff7f8_100%)] p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:items-center">
                      <HoldedStatusVisual eyebrow="Conexion segura" title="Comprobando acceso" />
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

                {!companyStepPending && redirecting ? (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_52%,#f7fbff_100%)] p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:items-center">
                      <HoldedStatusVisual eyebrow="Conexion lista" title="Ultimo paso" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                          Ultimo paso
                        </div>
                        <div className="mt-2 text-base font-semibold text-black">
                          {uiCopy.redirectTitle}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-700">
                          {redirectDescription}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <a
                            href={redirectTarget}
                            className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                          >
                            Continuar
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {!companyStepPending && !redirecting ? (
                  canContinueWithExistingConnection ? (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-3">
                        <span className="block">
                          Ya detectamos una conexion activa de Holded para esta empresa. Si quieres
                          usarla tal cual, puedes continuar ahora mismo.
                        </span>
                        <button
                          type="button"
                          onClick={() => goToNextStep(confirmedNextUrl)}
                          className="rounded-full bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Continuar con esta empresa
                        </button>
                      </div>
                    </div>
                  ) : null
                ) : null}

                {showApiStep && !redirecting ? (
                  <ol className="mt-4 space-y-2 text-sm text-neutral-700">
                    {helpSteps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {showApiStep && !redirecting ? (
                  <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <a
                      href={HOLDED_API_GUIDE_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-center gap-3 rounded-2xl border border-[#ff5460]/20 bg-[linear-gradient(135deg,#fff6f7_0%,#ffffff_100%)] px-4 py-4 text-left transition hover:border-[#ff5460]/40 hover:bg-[#fff7f8]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <Image
                          src="/brand/holded/holded-diamond-logo.png"
                          alt="Holded"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff5460]">
                          Guia oficial
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[#7a1f2a] underline decoration-[#ff5460]/40 underline-offset-4 group-hover:decoration-[#ff5460]">
                          Ver guia oficial de Holded para generar la API key
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-[#ff5460]" />
                    </a>

                    {usesInlineDirectForm ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-neutral-700">
                          Empresa
                          <input
                            type="text"
                            value={companyLegalName}
                            onChange={(event) => setCompanyLegalName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Tu empresa, S.L."
                            autoComplete="organization"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          NIF / CIF
                          <input
                            type="text"
                            value={companyTaxId}
                            onChange={(event) => setCompanyTaxId(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="B12345678"
                            autoComplete="off"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Nombre
                          <input
                            type="text"
                            value={contactFirstName}
                            onChange={(event) => setContactFirstName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Nombre"
                            autoComplete="given-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Apellidos
                          <input
                            type="text"
                            value={contactLastName}
                            onChange={(event) => setContactLastName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="Apellidos"
                            autoComplete="family-name"
                          />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700 sm:col-span-2">
                          Correo
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(event) => setContactEmail(event.target.value)}
                            className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                            placeholder="nombre@empresa.com"
                            autoComplete="email"
                          />
                        </label>
                      </div>
                    ) : null}

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-black">
                        {uiCopy.apiKeyLabel}
                      </span>
                      <span className="mb-3 block text-sm text-neutral-600">{apiKeyHelp}</span>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(event) => {
                            setApiKey(event.target.value);
                            setValidationToken(null);
                            setValidatedApiKey('');
                          }}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={uiCopy.apiKeyPlaceholder}
                          className="h-12 w-full rounded-2xl border border-neutral-300 bg-white pl-11 pr-4 text-sm text-black outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
                        />
                      </div>
                    </label>

                    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div>
                        Al conectar aceptas los{' '}
                        <a
                          href={VERIFACTU_TERMS_URL}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                        >
                          Terminos
                        </a>{' '}
                        y la{' '}
                        <a
                          href={VERIFACTU_PRIVACY_URL}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                        >
                          Politica de Privacidad
                        </a>{' '}
                        de verifactu.business.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          !normalizedApiKey ||
                          (usesInlineDirectForm && !hasInlineDirectFormMinimum)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {submitLabel}
                      </button>
                    </div>
                  </form>
                ) : null}
              </>
            )}

            {saving ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_55%,#fff6f6_100%)] p-4">
                <div className="grid gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:items-center">
                  <HoldedStatusVisual eyebrow="Validacion activa" title="Dejando todo listo" />
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
                  {!saving && !needsPostValidationCompanyStep ? (
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

            <div className="mt-6 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
              Operado de forma segura por{' '}
              <a
                href="https://verifactu.business"
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-neutral-700 hover:text-black"
              >
                verifactu.business
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
