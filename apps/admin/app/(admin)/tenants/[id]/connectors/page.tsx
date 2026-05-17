'use client';

/**
 * F6.1 — pagina admin que lista las ExternalConnection (provider='holded') de
 * un tenant. Para cada conexion muestra canal, estado, fecha conexion, ultima
 * actividad, ultimo error y permite revocarla.
 *
 * Fase inicial. F6.2-F6.4 (metricas globales, busqueda, audit log viewer)
 * llegan en Sesion 6.
 */

import { adminGet, adminPost } from '@/lib/adminApi';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type IsaakSettings = {
  holded_enabled: boolean;
  consent_given: boolean;
  consent_given_at: string | null;
  enabled_by: string | null;
  enabled_at: string | null;
  notes: string | null;
};

type IsaakUsage = {
  conversations: {
    total: number;
    firstActivityAt: string | null;
    lastActivityAt: string | null;
  };
  messages: {
    total: number;
    last30Days: number;
    byRole: { user: number; assistant: number };
  };
  feedback: { thumbsUp: number; thumbsDown: number };
  usageEvents: { type: string; count: number }[];
};

type WaActivity = {
  threads: { total: number; active: number; opted_out: number; phone_numbers: string[] };
  messages: { total: number; inbound: number; outbound: number; last_30_days: number };
  last_activity: string | null;
};

type ConnectorRow = {
  id: string;
  channelKey: 'dashboard' | 'chatgpt' | 'mobile' | 'claude' | string;
  status: string;
  ownershipStatus: string | null;
  flags: {
    managedByThirdParty: boolean;
    clientAdminGap: boolean;
    highGovernanceRisk: boolean;
    underClaimReview: boolean;
  };
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  disconnectedAt: string | null;
  revokedAt: string | null;
  lastError: string | null;
  legal: { termsAcceptedAt: string | null; version: string | null };
  connectedBy: { userId: string; email: string | null; name: string | null } | null;
};

const CHANNEL_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  chatgpt: 'ChatGPT',
  mobile: 'ChatGPT mobile',
  claude: 'Claude Desktop',
};

const STATUS_STYLES: Record<string, string> = {
  connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-amber-50 text-amber-700 border-amber-200',
  revoked_api: 'bg-rose-50 text-rose-700 border-rose-200',
  disconnected: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

export default function TenantConnectorsPage() {
  const params = useParams<{ id: string }>();
  const tenantId = (params?.id as string) || '';

  const [items, setItems] = useState<ConnectorRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeBusy, setRevokeBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isaakSettings, setIsaakSettings] = useState<IsaakSettings | null>(null);
  const [isaakBusy, setIsaakBusy] = useState(false);
  const [isaakUsage, setIsaakUsage] = useState<IsaakUsage | null>(null);
  const [waActivity, setWaActivity] = useState<WaActivity | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [connectorsData, settingsData, usageData, waData] = await Promise.all([
        adminGet<{ items: ConnectorRow[] }>(`/api/admin/tenants/${tenantId}/connectors`),
        adminGet<IsaakSettings>(`/api/admin/tenants/${tenantId}/isaak-settings`).catch(() => null),
        adminGet<IsaakUsage>(`/api/admin/tenants/${tenantId}/isaak-usage`).catch(() => null),
        adminGet<WaActivity>(`/api/admin/tenants/${tenantId}/whatsapp-activity`).catch(() => null),
      ]);
      setItems(connectorsData.items ?? []);
      if (settingsData) setIsaakSettings(settingsData);
      if (usageData) setIsaakUsage(usageData);
      if (waData) setWaActivity(waData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando conectores');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleIsaakToggle(enable: boolean) {
    if (!tenantId || isaakBusy) return;
    setIsaakBusy(true);
    setNotice(null);
    try {
      const result = await adminPost<IsaakSettings & { ok: boolean }>(
        `/api/admin/tenants/${tenantId}/isaak-settings`,
        { holded_enabled: enable }
      );
      setIsaakSettings((prev) => ({ ...(prev ?? ({} as IsaakSettings)), ...result }));
      setNotice(enable ? 'Isaak Holded activado para este tenant.' : 'Isaak Holded desactivado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando configuración Isaak');
    } finally {
      setIsaakBusy(false);
    }
  }

  async function handleRevoke(connectionId: string, channelKey: string) {
    if (!tenantId) return;
    const confirmed = window.confirm(
      `Vas a revocar la conexión "${CHANNEL_LABELS[channelKey] ?? channelKey}" de este tenant. La acción es irreversible y borra la API key cifrada. ¿Continuar?`
    );
    if (!confirmed) return;

    setRevokeBusy(connectionId);
    setNotice(null);
    setError(null);
    try {
      await adminPost<{ ok: true; connectionId: string }>(
        `/api/admin/tenants/${tenantId}/connectors/${connectionId}/revoke`,
        { reason: 'admin_panel_revoke' }
      );
      setNotice(`Conexión revocada (${connectionId.slice(0, 8)}…)`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revocar');
    } finally {
      setRevokeBusy(null);
    }
  }

  return (
    <main className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-soft sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Conectores Holded</h1>
            <p className="mt-2 text-sm text-slate-600">
              Conexiones MCP/Holded de este tenant. Ver canal, estado y revocar.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Refrescar'}
          </button>
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-soft">
        {loading && !items ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">Cargando conexiones…</div>
        ) : items && items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Este tenant no tiene conectores Holded registrados.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Canal
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Estado
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Conectado por
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Conectado
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Última actividad
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Último error
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(items ?? []).map((row) => {
                const statusClass =
                  STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                const channelLabel = CHANNEL_LABELS[row.channelKey] ?? row.channelKey;
                const lastActivity = row.lastSyncAt || row.lastValidatedAt || row.connectedAt;
                const isFinal = row.status === 'revoked_api' || row.status === 'disconnected';
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-sm font-medium text-slate-800">{channelLabel}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${statusClass}`}
                      >
                        {row.status}
                      </span>
                      {row.flags.highGovernanceRisk ? (
                        <span className="ml-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          governance
                        </span>
                      ) : null}
                      {row.flags.underClaimReview ? (
                        <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          claim
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.connectedBy ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {row.connectedBy.name ||
                              row.connectedBy.email ||
                              row.connectedBy.userId}
                          </span>
                          {row.connectedBy.email ? (
                            <span className="text-slate-500">{row.connectedBy.email}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {formatDate(row.connectedAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">{formatDate(lastActivity)}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.lastError ? (
                        <span className="line-clamp-2 text-rose-700">{row.lastError}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isFinal ? (
                        <span className="text-xs text-slate-400">
                          {row.revokedAt ? `revocada ${formatDate(row.revokedAt)}` : 'desconectada'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevoke(row.id, row.channelKey)}
                          disabled={revokeBusy === row.id}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {revokeBusy === row.id ? 'Revocando…' : 'Revocar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Isaak — configuración por tenant ───────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Isaak — Configuración</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Controla si este tenant puede usar Isaak con sus datos reales de Holded.
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
              isaakSettings?.holded_enabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            {isaakSettings?.holded_enabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700">Holded context en Isaak</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Cuando está activo, Isaak puede leer las facturas, contactos y cuentas del tenant en
                Holded.
              </p>
              {isaakSettings?.enabled_at && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Activado el {new Date(isaakSettings.enabled_at).toLocaleDateString('es-ES')}{' '}
                  {isaakSettings.enabled_by ? `por ${isaakSettings.enabled_by}` : ''}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={isaakBusy || loading}
              onClick={() => void handleIsaakToggle(!isaakSettings?.holded_enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                isaakSettings?.holded_enabled ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={isaakSettings?.holded_enabled ? 'true' : 'false'}
              aria-label={
                isaakSettings?.holded_enabled ? 'Desactivar Isaak Holded' : 'Activar Isaak Holded'
              }
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ${
                  isaakSettings?.holded_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs font-medium text-slate-700">Consentimiento de datos</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                El tenant ha aceptado que Isaak acceda a su información fiscal y contable.
              </p>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                isaakSettings?.consent_given
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {isaakSettings?.consent_given
                ? `Dado${isaakSettings.consent_given_at ? ` · ${new Date(isaakSettings.consent_given_at).toLocaleDateString('es-ES')}` : ''}`
                : 'Pendiente'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Isaak — métricas de uso (L6) ──────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Isaak — Uso</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Conversaciones, mensajes y feedback de este tenant en Isaak.
          </p>
        </div>

        {!isaakUsage ? (
          <div className="px-5 py-6 text-center text-xs text-slate-400">
            {loading ? 'Cargando métricas…' : 'Sin datos de uso disponibles.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4">
            {/* Conversations */}
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Conversaciones
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {isaakUsage.conversations.total}
              </p>
              {isaakUsage.conversations.firstActivityAt && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Primera:{' '}
                  {new Date(isaakUsage.conversations.firstActivityAt).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Mensajes totales
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{isaakUsage.messages.total}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                {isaakUsage.messages.last30Days} últimos 30d
              </p>
            </div>

            {/* Last activity */}
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Última actividad
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {isaakUsage.conversations.lastActivityAt
                  ? new Date(isaakUsage.conversations.lastActivityAt).toLocaleDateString('es-ES')
                  : '—'}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {isaakUsage.messages.byRole.user}u / {isaakUsage.messages.byRole.assistant}a
              </p>
            </div>

            {/* Feedback */}
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Feedback
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-lg font-bold text-emerald-600">
                  👍 {isaakUsage.feedback.thumbsUp}
                </span>
                <span className="text-lg font-bold text-rose-500">
                  👎 {isaakUsage.feedback.thumbsDown}
                </span>
              </div>
              {isaakUsage.feedback.thumbsUp + isaakUsage.feedback.thumbsDown > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {Math.round(
                    (isaakUsage.feedback.thumbsUp /
                      (isaakUsage.feedback.thumbsUp + isaakUsage.feedback.thumbsDown)) *
                      100
                  )}
                  % positivo
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* WhatsApp activity — W6 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">WhatsApp</h2>
        <p className="mb-4 text-xs text-slate-500">
          Actividad del canal WhatsApp de Isaak para este tenant.
        </p>
        {!waActivity ? (
          <p className="text-xs text-slate-400">Sin actividad registrada.</p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Threads</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{waActivity.threads.total}</p>
                <p className="text-[10px] text-slate-400">
                  {waActivity.threads.active} activos · {waActivity.threads.opted_out} opt-out
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Mensajes totales</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {waActivity.messages.total}
                </p>
                <p className="text-[10px] text-slate-400">
                  ↓{waActivity.messages.inbound} ↑{waActivity.messages.outbound}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Últimos 30d</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {waActivity.messages.last_30_days}
                </p>
                <p className="text-[10px] text-slate-400">mensajes</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Última actividad</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {waActivity.last_activity
                    ? new Date(waActivity.last_activity).toLocaleDateString('es-ES')
                    : '—'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {waActivity.last_activity
                    ? new Date(waActivity.last_activity).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
              </div>
            </div>
            {waActivity.threads.phone_numbers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {waActivity.threads.phone_numbers.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                  >
                    📱 {p}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <p className="text-xs text-slate-400">
        F6.1 + L6 + W6. Métricas globales multi-tenant y audit log llegan en F6.2-F6.4.
      </p>
    </main>
  );
}
