'use client';

import { adminGet, adminPost } from '@/lib/adminApi';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type GoogleToken = {
  id: string;
  userId: string;
  email: string | null;
  scopes: string | null;
  expiresAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type MicrosoftToken = {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  scopes: string | null;
  expiresAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type BankingConn = {
  id: string;
  provider: 'saltedge' | 'gcbd' | 'enablebanking' | string;
  providerCode: string;
  providerName: string;
  countryCode: string;
  status: string;
  lastSyncAt: string | null;
  expiresAt: string | null;
  accountCount: number;
  createdAt: string;
  updatedAt: string;
};

type Certificate = {
  id: string;
  certType: string;
  nif: string;
  commonName: string;
  issuer: string | null;
  validFrom: string;
  validTo: string;
  createdAt: string;
};

type IntegrationsData = {
  google: GoogleToken[];
  microsoft: MicrosoftToken[];
  banking: BankingConn[];
  certificate: Certificate | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(v: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return v;
  }
}

function fmtDateOnly(v: string): string {
  try {
    return new Date(v).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
  } catch {
    return v;
  }
}

type TokenHealth = 'ok' | 'expiring' | 'expired' | 'unknown';

function tokenHealth(expiresAt: string | null): TokenHealth {
  if (!expiresAt) return 'unknown';
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  if (exp < now) return 'expired';
  if (exp < now + 14 * 86_400_000) return 'expiring';
  return 'ok';
}

const HEALTH_BADGE: Record<TokenHealth, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expiring: 'border-amber-200 bg-amber-50 text-amber-700',
  expired: 'border-rose-200 bg-rose-50 text-rose-700',
  unknown: 'border-slate-200 bg-slate-50 text-slate-500',
};

const HEALTH_LABEL: Record<TokenHealth, string> = {
  ok: 'Activo',
  expiring: 'Expira pronto',
  expired: 'Expirado',
  unknown: 'Sin expiración',
};

const BANKING_STATUS_BADGE: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  expired: 'border-rose-200 bg-rose-50 text-rose-700',
  inactive: 'border-slate-200 bg-slate-50 text-slate-500',
  disabled: 'border-slate-200 bg-slate-50 text-slate-500',
};

const PROVIDER_LABEL: Record<string, string> = {
  saltedge: 'Salt Edge',
  gcbd: 'GoCardless BD',
  enablebanking: 'Enable Banking',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
        {count}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-6 text-center text-xs text-slate-400">{text}</p>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TenantIntegrationsPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params?.id ?? '';

  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await adminGet<IntegrationsData>(
        `/api/admin/tenants/${tenantId}/integrations`
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando integraciones');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleRevoke(type: string, id: string, label: string) {
    if (!window.confirm(`¿Revocar la integración "${label}"? Esta acción desconectará al usuario.`))
      return;
    setBusy(`${type}:${id}`);
    setNotice(null);
    setError(null);
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/integrations`, {
        action: 'revoke',
        type,
        id,
      });
      setNotice(`Integración revocada: ${label}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error revocando integración');
    } finally {
      setBusy(null);
    }
  }

  const certHealth = data?.certificate ? tokenHealth(data.certificate.validTo) : null;

  return (
    <main className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-soft sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Integraciones</h1>
            <p className="mt-2 text-sm text-slate-600">
              Estado de las integraciones OAuth, bancarias y certificado AEAT de este tenant.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Refrescar'}
          </button>
        </div>
      </header>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* ── Google OAuth ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <SectionHeader
          title="Google (Calendar · Gmail · Drive)"
          subtitle="Tokens OAuth de usuarios de este tenant."
          count={data?.google.length ?? 0}
        />
        {!data ? (
          <EmptyState text={loading ? 'Cargando…' : 'Sin datos.'} />
        ) : data.google.length === 0 ? (
          <EmptyState text="Ningún usuario ha conectado Google." />
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Cuenta
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Expira
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Actualizado
                </th>
                <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.google.map((t) => {
                const health = tokenHealth(t.expiresAt);
                const busyKey = `google:${t.id}`;
                return (
                  <tr key={t.id} className="text-slate-700 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{t.email ?? t.userId}</span>
                      {t.scopes && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          {t.scopes.split(' ').length} scopes
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${HEALTH_BADGE[health]}`}
                      >
                        {HEALTH_LABEL[health]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(t.expiresAt)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(t.updatedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busy === busyKey}
                        onClick={() => void handleRevoke('google', t.id, t.email ?? t.userId)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy === busyKey ? 'Revocando…' : 'Revocar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Microsoft OAuth ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <SectionHeader
          title="Microsoft 365 (Outlook · Calendar · OneDrive)"
          subtitle="Tokens OAuth de usuarios de este tenant."
          count={data?.microsoft.length ?? 0}
        />
        {!data ? (
          <EmptyState text={loading ? 'Cargando…' : 'Sin datos.'} />
        ) : data.microsoft.length === 0 ? (
          <EmptyState text="Ningún usuario ha conectado Microsoft 365." />
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Cuenta
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Expira
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Actualizado
                </th>
                <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.microsoft.map((t) => {
                const health = tokenHealth(t.expiresAt);
                const busyKey = `microsoft:${t.id}`;
                const label = t.displayName ?? t.email ?? t.userId;
                return (
                  <tr key={t.id} className="text-slate-700 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{label}</span>
                      {t.email && t.displayName && (
                        <span className="ml-1 text-[10px] text-slate-400">{t.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${HEALTH_BADGE[health]}`}
                      >
                        {HEALTH_LABEL[health]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(t.expiresAt)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(t.updatedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busy === busyKey}
                        onClick={() => void handleRevoke('microsoft', t.id, label)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy === busyKey ? 'Revocando…' : 'Revocar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Open Banking ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <SectionHeader
          title="Open Banking"
          subtitle="Conexiones Salt Edge / Enable Banking / GoCardless."
          count={data?.banking.length ?? 0}
        />
        {!data ? (
          <EmptyState text={loading ? 'Cargando…' : 'Sin datos.'} />
        ) : data.banking.length === 0 ? (
          <EmptyState text="Sin conexiones bancarias." />
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Entidad
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Proveedor
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Cuentas
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Última sync
                </th>
                <th className="px-4 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Expira
                </th>
                <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.banking.map((c) => {
                const statusClass =
                  BANKING_STATUS_BADGE[c.status] ?? 'border-slate-200 bg-slate-50 text-slate-500';
                const busyKey = `banking:${c.id}`;
                const isFinal = c.status === 'disabled' || c.status === 'inactive';
                return (
                  <tr key={c.id} className="text-slate-700 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{c.providerName}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {PROVIDER_LABEL[c.provider] ?? c.provider}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{c.accountCount}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(c.lastSyncAt)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(c.expiresAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isFinal ? (
                        <span className="text-[10px] text-slate-400">Desactivada</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === busyKey}
                          onClick={() => void handleRevoke('banking', c.id, c.providerName)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy === busyKey ? 'Revocando…' : 'Deshabilitar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Certificado AEAT ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Certificado AEAT (Veri*Factu)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Certificado digital para firma y envío de facturas a la AEAT.
            </p>
          </div>
          {certHealth && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${HEALTH_BADGE[certHealth]}`}
            >
              {HEALTH_LABEL[certHealth]}
            </span>
          )}
        </div>

        {!data ? (
          <EmptyState text={loading ? 'Cargando…' : 'Sin datos.'} />
        ) : !data.certificate ? (
          <EmptyState text="Sin certificado configurado." />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Titular</p>
              <p className="mt-0.5 text-slate-800">{data.certificate.commonName}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">NIF</p>
              <p className="mt-0.5 font-mono text-slate-800">{data.certificate.nif}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Tipo</p>
              <p className="mt-0.5 text-slate-800">
                {data.certificate.certType === 'persona_fisica' ? 'Persona física' : 'Entidad'}
              </p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Emisor</p>
              <p className="mt-0.5 text-slate-800">{data.certificate.issuer ?? '—'}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Válido desde</p>
              <p className="mt-0.5 text-slate-800">{fmtDateOnly(data.certificate.validFrom)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Válido hasta</p>
              <p
                className={`mt-0.5 font-semibold ${certHealth === 'expired' ? 'text-rose-600' : certHealth === 'expiring' ? 'text-amber-600' : 'text-slate-800'}`}
              >
                {fmtDateOnly(data.certificate.validTo)}
              </p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Subido</p>
              <p className="mt-0.5 text-slate-800">{fmtDateOnly(data.certificate.createdAt)}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
