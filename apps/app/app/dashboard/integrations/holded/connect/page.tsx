'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import { StatusBadge } from '@verifactu/ui';
import type { AccountingStatusResponse } from '@verifactu/integrations/holded/contracts';
import type { HoldedUiBanner } from '@verifactu/integrations/holded/uiState';
import {
  getHoldedConnectionBadge,
  getHoldedConnectionStatusLabel,
  getHoldedGovernanceBadges,
  getHoldedStatusBanners,
} from '@verifactu/integrations/holded/uiState';

const VERIFACTU_TERMS_URL = 'https://verifactu.business/terms';
const VERIFACTU_PRIVACY_URL = 'https://verifactu.business/privacy';

type IntegrationStatus = AccountingStatusResponse & {
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  connected: boolean;
  plan?: string | null;
  canConnect?: boolean;
  canUseAccountingApiIntegration?: boolean;
};

function bannerToneClasses(tone: HoldedUiBanner['tone']) {
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

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('es-ES');
  } catch {
    return value;
  }
}

export default function HoldedConnectorConnectPage() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/accounting/status', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el estado de Holded');
      setStatus(data as IntegrationStatus);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar Holded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const connectionBadge = useMemo(
    () => getHoldedConnectionBadge(status?.connection ?? null),
    [status?.connection]
  );
  const governanceBadges = useMemo(
    () => getHoldedGovernanceBadges(status?.governanceFlags ?? null),
    [status?.governanceFlags]
  );
  const banners = useMemo(
    () =>
      getHoldedStatusBanners({
        connection: status?.connection ?? null,
        governanceFlags: status?.governanceFlags ?? null,
        availableActions: status?.availableActions ?? null,
      }),
    [status?.availableActions, status?.connection, status?.governanceFlags]
  );

  const submitLabel =
    status?.connection?.status && status.connection.status !== 'disconnected'
      ? 'Actualizar conexion'
      : 'Guardar conexion';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError('Necesitamos una API key valida para conectar Holded.');
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Debes aceptar los Terminos y la Politica de Privacidad para continuar.');
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
          'x-holded-entry-channel': 'dashboard',
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          acceptedTerms,
          acceptedPrivacy,
          mode:
            status?.connection?.status && status.connection.status !== 'disconnected'
              ? 'reconnect'
              : 'initial',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo conectar Holded');
      if (!data?.ok) {
        throw new Error(
          data?.probe?.error || data?.lastError || 'La API key de Holded no se pudo validar'
        );
      }

      setMessage(
        data?.warnings?.length
          ? `Conexion actualizada. Revision pendiente: ${data.warnings[0]}`
          : 'Holded se ha conectado correctamente para este tenant.'
      );
      setApiKey('');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo conectar Holded');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/integrations/holded"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conectar Holded</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pantalla privada de Verifactu Business para alta, reconexion o rotacion de la API key.
          </p>
        </div>
      </div>

      {banners.length > 0 ? (
        <section className="space-y-3">
          {banners.map((banner) => (
            <article
              key={banner.key}
              className={`rounded-2xl border px-4 py-4 text-sm ${bannerToneClasses(banner.tone)}`}
            >
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{banner.title}</div>
                  <p className="mt-1 leading-6">{banner.message}</p>
                  {banner.actionLabel ? (
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em]">
                      Accion sugerida: {banner.actionLabel}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Estado actual</div>
              <div className="mt-1 text-sm text-slate-600">
                {loading
                  ? 'Comprobando conexion'
                  : getHoldedConnectionStatusLabel(status?.connection?.status)}
              </div>
            </div>
            <StatusBadge label={connectionBadge.label} variant={connectionBadge.variant} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {governanceBadges.map((badge) => (
              <StatusBadge key={badge.key} label={badge.label} variant={badge.variant} />
            ))}
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-semibold text-slate-900">{status?.plan || '—'}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Ultima validacion</dt>
              <dd className="font-semibold text-slate-900">
                {formatDateTime(status?.connection?.lastValidatedAt || status?.lastSyncAt)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Ultimo error</dt>
              <dd className="max-w-[18rem] text-right font-semibold text-slate-900">
                {status?.connection?.lastError || status?.lastError || '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Acceso API</dt>
              <dd className="font-semibold text-slate-900">
                {status?.canConnect === false ? 'No disponible por plan' : 'Disponible'}
              </dd>
            </div>
          </dl>

          {status?.availableActions.rotateApi.blocked ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Accion condicionada</div>
              <div className="mt-1">{status.availableActions.rotateApi.reason}</div>
            </div>
          ) : null}

          {status?.canConnect === false ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Esta integracion interna esta disponible en planes Empresa y PRO.
            </div>
          ) : null}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">API key de Holded</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Esta accion actualiza la conexion tecnica. El estado de gobernanza y los bloqueos siguen
            visibles para evitar cambios opacos.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-900">API key</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Pega aqui la API key de Holded"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0b6cfb] focus:ring-4 focus:ring-[#0b6cfb]/10"
                />
              </div>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <input
                  id="dashboard-accept-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0b6cfb] focus:ring-[#0b6cfb]"
                />
                <label htmlFor="dashboard-accept-terms" className="leading-6">
                  Acepto los{' '}
                  <a
                    href={VERIFACTU_TERMS_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-[#0b6cfb] hover:text-[#095edb]"
                  >
                    Terminos de verifactu.business
                  </a>
                  .
                </label>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <input
                  id="dashboard-accept-privacy"
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0b6cfb] focus:ring-[#0b6cfb]"
                />
                <label htmlFor="dashboard-accept-privacy" className="leading-6">
                  Acepto la{' '}
                  <a
                    href={VERIFACTU_PRIVACY_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-[#0b6cfb] hover:text-[#095edb]"
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
                disabled={
                  saving ||
                  loading ||
                  status?.canConnect === false ||
                  !acceptedTerms ||
                  !acceptedPrivacy
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b6cfb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={saving || loading}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Actualizar estado
              </button>
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
        </article>
      </section>
    </div>
  );
}
