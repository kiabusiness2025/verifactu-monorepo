'use client';

import { getIsaakHoldedOnboardingCopy } from '@/lib/isaak/persona';
import { getPreferredFirstName } from '@/lib/personName';
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
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HoldedCompanySetupState } from './flowState';
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
  onboardingToken: string | null;
  requireConnectionConfirmation: boolean;
  summary: {
    companyName: string;
    companyLegalName: string | null;
    companyTaxId: string | null;
    contactFirstName: string;
    contactFullName: string | null;
    contactEmail: string | null;
    companyEmail: string | null;
    contactPhone: string | null;
  };
  companySetup: HoldedCompanySetupState;
};

const onboardingCopy = getIsaakHoldedOnboardingCopy();
const HOLDED_COMPAT_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const CHATGPT_HOME_URL = 'https://chatgpt.com';
const HOLDED_API_GUIDE_URL =
  'https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded';
const VERIFACTU_TERMS_URL = 'https://verifactu.business/terms';
const VERIFACTU_PRIVACY_URL = 'https://verifactu.business/privacy';

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

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
    'Primero validaremos la API key. Despues te pediremos el nombre de empresa y el correo exactos tal y como aparecen en Holded.',
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
    'Pegala aqui para validarla y luego confirma los datos exactos de empresa y usuario.',
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
  onboardingToken,
  requireConnectionConfirmation,
  summary,
  companySetup,
}: Props) {
  const isChatgptEntry = entryChannel === 'chatgpt';
  const needsPostValidationCompanyStep = isChatgptEntry;
  const uiCopy = isChatgptEntry ? chatgptUiCopy : dashboardUiCopy;
  const savingMessages = uiCopy.savingMessages;
  const hasResolvedCompanyProfile =
    companySetup.hasResolvedCompany &&
    Boolean(summary.contactEmail || summary.companyEmail || summary.companyTaxId);
  const [apiKey, setApiKey] = useState('');
  const [resolvedSummary, setResolvedSummary] = useState(summary);
  const [companyName, setCompanyName] = useState(
    summary.companyName === 'Tu empresa' ? '' : summary.companyName
  );
  const [companyLegalName, setCompanyLegalName] = useState(
    summary.companyLegalName ?? (summary.companyName === 'Tu empresa' ? '' : summary.companyName)
  );
  const [companyTaxId, setCompanyTaxId] = useState(summary.companyTaxId ?? '');
  const [contactName, setContactName] = useState(
    summary.contactFullName ?? summary.contactFirstName
  );
  const [contactEmail, setContactEmail] = useState(
    summary.contactEmail ?? summary.companyEmail ?? ''
  );
  const [contactPhone, setContactPhone] = useState(summary.contactPhone ?? '');
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingMessageIndex, setSavingMessageIndex] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const showApiStep = !needsPostValidationCompanyStep || !apiValidated;
  const hideResolvedCompanyUntilApiValidation = needsPostValidationCompanyStep && !apiValidated;
  const companyStepPending =
    needsPostValidationCompanyStep && apiValidated && (showCompanyForm || !companyConfirmed);
  const showCompanyLegalName =
    !!resolvedSummary.companyLegalName &&
    resolvedSummary.companyLegalName.trim().toLowerCase() !==
      resolvedSummary.companyName.trim().toLowerCase();
  const showCompanyEmail =
    !!resolvedSummary.companyEmail &&
    resolvedSummary.companyEmail.trim() !== (resolvedSummary.contactEmail || '').trim();
  const canContinueWithExistingConnection =
    !!status?.connected &&
    !needsPostValidationCompanyStep &&
    requireConnectionConfirmation &&
    companyConfirmed &&
    !saving &&
    !redirecting;
  const personalizedLead = !showApiStep
    ? `${resolvedSummary.contactFirstName}, ahora necesitamos confirmar los datos exactos de empresa y usuario tal y como aparecen en Holded.`
    : hideResolvedCompanyUntilApiValidation
      ? 'Primero validaremos tu API key. Despues te pediremos confirmar los datos exactos de la empresa conectada.'
      : isChatgptEntry
        ? `${resolvedSummary.contactFirstName}, primero validaremos tu API key y despues guardaremos los datos exactos de empresa y usuario.`
        : `${resolvedSummary.contactFirstName}, vamos a dejar lista la conexion de ${resolvedSummary.companyName}.`;

  const confirmedNextUrl = useMemo(() => {
    if (!requireConnectionConfirmation) return nextUrl;

    try {
      const parsed = new URL(nextUrl, HOLDED_COMPAT_URL);
      if (parsed.pathname === '/oauth/authorize') {
        parsed.searchParams.set('connection_confirmed', '1');
        if (selectedTenantId) {
          parsed.searchParams.set('tenant_id', selectedTenantId);
        }
      }
      return parsed.toString();
    } catch {
      return nextUrl;
    }
  }, [nextUrl, requireConnectionConfirmation, selectedTenantId]);

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
      window.location.replace(target);
    },
    [nextUrl]
  );

  const returnToApiStep = useCallback(() => {
    setApiValidated(false);
    setCompanyConfirmed(false);
    setCompanyError(null);
    setCompanyMessage(null);
    setMessage(null);
    setError(null);
    setSelectedTenantId(null);
  }, []);

  const handleHeaderBack = useCallback(() => {
    if (companyStepPending) {
      returnToApiStep();
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(isChatgptEntry ? CHATGPT_HOME_URL : nextUrl || HOLDED_COMPAT_URL);
  }, [companyStepPending, isChatgptEntry, nextUrl, returnToApiStep]);

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
    if (needsPostValidationCompanyStep || companyStepPending) {
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
        if (data?.connected && nextUrl && !requireConnectionConfirmation) {
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
  }, [
    companyStepPending,
    goToNextStep,
    loadStatus,
    needsPostValidationCompanyStep,
    nextUrl,
    onboardingToken,
    requireConnectionConfirmation,
    uiCopy.errorLoadFailed,
  ]);

  const handleRetryStatus = async () => {
    if (needsPostValidationCompanyStep || companyStepPending) return;

    setLoading(true);
    setError(null);
    try {
      const data = await loadStatus();
      setStatus(data);
      if (data?.connected && nextUrl && !requireConnectionConfirmation) {
        goToNextStep();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : uiCopy.errorLoadFailed);
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async () => {
    const res = await fetch('/api/integrations/accounting/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-isaak-entry-channel': entryChannel,
        ...(onboardingToken ? { 'x-isaak-onboarding-token': onboardingToken } : {}),
      },
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        acceptedTerms,
        acceptedPrivacy,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        data?.debug ||
          data?.detail ||
          data?.error ||
          `Error HTTP ${res.status} al validar la API key de Holded`
      );
    }
    if (!data?.ok) {
      throw new Error(
        data?.probe?.error || 'No hemos podido validar tu acceso con el ERP compatible'
      );
    }

    return data;
  };

  const connectValidatedApi = async (tenantIdHint?: string | null) => {
    const res = await fetch('/api/integrations/accounting/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-isaak-entry-channel': entryChannel,
        ...(onboardingToken ? { 'x-isaak-onboarding-token': onboardingToken } : {}),
        ...(tenantIdHint ? { 'x-isaak-tenant-id': tenantIdHint } : {}),
      },
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        acceptedTerms,
        acceptedPrivacy,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        data?.debug ||
          data?.detail ||
          data?.error ||
          `Error HTTP ${res.status} al activar ${isChatgptEntry ? 'la conexion' : 'Isaak'}`
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

  const handleCompanySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCompanyName = normalizeText(companyName);
    const normalizedLegalName = normalizeText(companyLegalName) || normalizedCompanyName;
    const normalizedTaxId = normalizeText(companyTaxId).toUpperCase();
    const normalizedContactName = normalizeText(contactName);
    const normalizedContactEmail = normalizeText(contactEmail);
    const normalizedContactPhone = normalizeText(contactPhone);

    if (
      !normalizedCompanyName ||
      !normalizedTaxId ||
      !normalizedContactName ||
      !normalizedContactEmail
    ) {
      setCompanyError(
        'Necesitamos nombre de empresa, NIF/CIF, persona de contacto y correo para continuar.'
      );
      return;
    }

    setCompanySaving(true);
    setCompanyError(null);
    setCompanyMessage(null);

    try {
      const createRes = await fetch('/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reuseCurrentTenant: true,
          source: 'manual',
          name: normalizedCompanyName,
          legalName: normalizedLegalName,
          nif: normalizedTaxId,
          extra: {
            representative: normalizedContactName,
            email: normalizedContactEmail,
            phone: normalizedContactPhone || undefined,
          },
        }),
      });
      const createData = await createRes.json().catch(() => null);

      if (createData?.action === 'REQUEST_ACCESS') {
        throw new Error('Esta empresa ya existe, pero tu usuario no tiene acceso a ella.');
      }

      if (!createRes.ok || !createData?.ok) {
        if (createData?.action === 'TRIAL_LIMIT_REACHED') {
          throw new Error(
            createData?.error ||
              'En modo prueba solo puedes usar una empresa con datos reales. Revisa tu plan para continuar.'
          );
        }

        throw new Error(createData?.error || 'No hemos podido preparar la empresa para continuar.');
      }

      const nextTenantId =
        typeof createData?.tenantId === 'string' ? createData.tenantId.trim() : '';
      if (!nextTenantId) {
        throw new Error('La empresa se ha creado, pero no hemos podido activarla en tu sesion.');
      }

      setSelectedTenantId(nextTenantId);

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

      const nextLegalName =
        normalizedLegalName.toLowerCase() === normalizedCompanyName.toLowerCase()
          ? null
          : normalizedLegalName;
      const nextContactFirstName = getPreferredFirstName({
        fullName: normalizedContactName,
        email: normalizedContactEmail,
        fallback: resolvedSummary.contactFirstName,
      });

      setResolvedSummary({
        companyName: normalizedCompanyName,
        companyLegalName: nextLegalName,
        companyTaxId: normalizedTaxId,
        contactFirstName: nextContactFirstName,
        contactFullName: normalizedContactName,
        contactEmail: normalizedContactEmail,
        companyEmail: normalizedContactEmail,
        contactPhone: normalizedContactPhone || null,
      });

      await connectValidatedApi(nextTenantId);

      setCompanyConfirmed(true);
      setShowCompanyForm(false);
      setCompanyMessage('Datos guardados. Ya estamos cerrando la conexion con Holded.');
      setError(null);
      setMessage(uiCopy.successConnected);
      goToNextStep(confirmedNextUrl);
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
    if (!apiKey.trim()) {
      setError(uiCopy.errorApiKeyEmpty);
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Necesitamos tu aceptacion de Terminos y Politica de Privacidad para continuar.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    setCompanyError(null);

    try {
      if (needsPostValidationCompanyStep && !apiValidated) {
        await validateApiKey();
        setApiValidated(true);
        setShowCompanyForm(true);
        setCompanyConfirmed(false);
        setCompanyMessage(
          'API key validada. Ahora necesitamos el nombre exacto de la empresa, su NIF/CIF y el correo principal tal y como aparecen en Holded.'
        );
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_45%,#ffffff_100%)] px-4 py-6 text-black sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-lg">
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
            <p className="mt-2 text-sm leading-6 text-neutral-700 sm:text-base">{uiCopy.intro}</p>
            <p className="mt-2 text-sm font-medium text-[#0b214a]">{personalizedLead}</p>

            <div className="mt-5 rounded-2xl border border-[#0b6cfb]/20 bg-[#f3f8ff] px-4 py-3 text-sm text-[#0b214a]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0b6cfb]" />
                <span>{uiCopy.security}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              {companyStepPending ? (
                <div>
                  <div className="text-sm font-semibold text-black">
                    Datos de empresa y contacto
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    La API key ya es valida. Ahora necesitamos guardar el nombre exacto de la
                    empresa, su NIF/CIF y el correo principal tal y como aparecen en Holded.
                  </p>

                  {hasResolvedCompanyProfile ? (
                    <div className="mt-3 rounded-2xl border border-[#0b6cfb]/15 bg-[#f7fbff] px-4 py-3 text-sm text-[#0b214a]">
                      Hemos precargado los datos de tu empresa actual como punto de partida. Si la
                      API pertenece a otra empresa, sustituyelos aqui antes de guardar.
                    </div>
                  ) : null}

                  <form onSubmit={handleCompanySubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Nombre comercial
                      <input
                        type="text"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                        placeholder="Tu empresa"
                        autoComplete="organization"
                      />
                    </label>
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
                      Persona usuaria en Holded
                      <input
                        type="text"
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm text-black outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                        placeholder="Nombre y apellidos"
                        autoComplete="name"
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
                      Primero valida tu API key
                    </div>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">
                      Antes de mostrar o confirmar ninguna empresa, necesitamos comprobar que la API
                      key corresponde a una conexion real de Holded.
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
              {!companyStepPending && !needsPostValidationCompanyStep && status?.degraded ? (
                <div className="mt-2 text-sm text-amber-700">{uiCopy.degraded}</div>
              ) : null}
            </div>

            {!needsPostValidationCompanyStep &&
            !companyStepPending &&
            loading &&
            !saving &&
            !redirecting ? (
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

            {!companyStepPending && redirecting ? (
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

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                  <div className="flex items-start gap-3">
                    <input
                      id="accept-terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                    />
                    <label htmlFor="accept-terms" className="leading-6">
                      Acepto los{' '}
                      <a
                        href={VERIFACTU_TERMS_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                      >
                        Terminos de verifactu.business
                      </a>
                      .
                    </label>
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <input
                      id="accept-privacy"
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                    />
                    <label htmlFor="accept-privacy" className="leading-6">
                      Acepto la{' '}
                      <a
                        href={VERIFACTU_PRIVACY_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-[#ff5460] hover:text-[#ef4654]"
                      >
                        Politica de Privacidad de verifactu.business
                      </a>
                      .
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving || !apiKey.trim() || !acceptedTerms || !acceptedPrivacy}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {needsPostValidationCompanyStep && !apiValidated
                      ? 'Validar API key'
                      : uiCopy.submitLabel}
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
              Powered by{' '}
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
