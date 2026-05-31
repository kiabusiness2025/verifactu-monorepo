'use client';

import { adminGet, adminPatch } from '@/lib/adminApi';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type WhitelabelConfig = {
  enabled?: boolean;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  faviconUrl?: string;
  supportEmail?: string;
  hidePoweredBy?: boolean;
};

type DailyMsg = { day: string; user_msgs: number };
type RecentConv = {
  id: string;
  title: string | null;
  message_count: number;
  last_activity: string;
  user_email: string;
  user_name: string | null;
};
type TopUser = {
  user_id: string;
  user_email: string;
  user_name: string | null;
  conversations: number;
  messages: number;
};
type UsageStats = {
  conversations: { total: number; firstActivityAt: string | null; lastActivityAt: string | null };
  messages: { total: number; last30Days: number; byRole: { user: number; assistant: number } };
  activeUsers7d: number;
  dailyMessages: DailyMsg[];
  recentConversations: RecentConv[];
  topUsers: TopUser[];
};

const DEFAULT_COLOR = '#2361d8';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Sparkline({ data }: { data: DailyMsg[] }) {
  if (!data.length) return <span className="text-xs text-slate-400">Sin datos</span>;
  const max = Math.max(...data.map((d) => d.user_msgs), 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((d) => (
        <div
          key={d.day}
          title={`${d.day}: ${d.user_msgs} msgs`}
          className="flex-1 rounded-sm bg-indigo-400 min-h-[2px]"
          style={{ height: `${Math.max(2, Math.round((d.user_msgs / max) * 32))}px` }}
        />
      ))}
    </div>
  );
}

type MemoryFact = {
  id: string;
  category: string;
  factKey: string;
  valueJson: unknown;
  scope: string;
  source: string;
  confidence: number | null;
  createdAt: string;
};
type LongTermMemoryEntry = {
  id: string;
  fact: string;
  factType: string;
  source: string;
  createdAt: string;
};
type MemoryResponse = {
  facts: MemoryFact[];
  longTerm: LongTermMemoryEntry[];
  totals: { facts: number; longTerm: number };
};

export default function TenantIsaakPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  // ── Usage metrics ────────────────────────────────────────────
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    void adminGet<UsageStats>(`/api/admin/tenants/${id}/isaak-usage`)
      .then((res) => setStats(res))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [id]);

  // ── Memory (V2.C.4) ──────────────────────────────────────────
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(true);

  useEffect(() => {
    setLoadingMemory(true);
    void adminGet<MemoryResponse>(`/api/admin/tenants/${id}/isaak-memory`)
      .then((res) => setMemory(res))
      .catch(() => setMemory(null))
      .finally(() => setLoadingMemory(false));
  }, [id]);

  // ── White-label config ───────────────────────────────────────
  const [config, setConfig] = useState<WhitelabelConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void adminGet<{ config: WhitelabelConfig | null }>(`/api/admin/tenants/${id}/whitelabel`)
      .then((res) => setConfig(res.config ?? {}))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await adminPatch<{ ok: boolean; config: WhitelabelConfig }>(
        `/api/admin/tenants/${id}/whitelabel`,
        config
      );
      setConfig(res.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Métricas de uso ───────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Uso de Isaak</h2>

        {loadingStats ? (
          <div className="py-6 text-center text-xs text-slate-400">Cargando métricas…</div>
        ) : !stats ? (
          <div className="py-6 text-center text-xs text-slate-400">No hay datos disponibles.</div>
        ) : (
          <>
            {/* KPI row */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-2xl font-bold text-slate-900">{stats.conversations.total}</div>
                <div className="text-xs text-slate-500">Conversaciones</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-2xl font-bold text-slate-900">{stats.messages.last30Days}</div>
                <div className="text-xs text-slate-500">Mensajes (30d)</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-2xl font-bold text-slate-900">{stats.messages.total}</div>
                <div className="text-xs text-slate-500">Mensajes totales</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-2xl font-bold text-slate-900">{stats.activeUsers7d}</div>
                <div className="text-xs text-slate-500">Usuarios activos (7d)</div>
              </div>
            </div>

            {/* Sparkline + last activity */}
            <div className="mb-5 flex items-end justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex-1">
                <div className="mb-1 text-xs font-semibold text-slate-500">
                  Mensajes/día (últimos 14 días)
                </div>
                <Sparkline data={stats.dailyMessages} />
              </div>
              <div className="text-right text-xs text-slate-500">
                <div className="font-semibold text-slate-700">Última actividad</div>
                <div>{fmtDate(stats.conversations.lastActivityAt)}</div>
                <div className="mt-1 font-semibold text-slate-700">Primera actividad</div>
                <div>{fmtDate(stats.conversations.firstActivityAt)}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Recent conversations */}
              {stats.recentConversations.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-slate-600">
                    Conversaciones recientes
                  </div>
                  <div className="space-y-1.5">
                    {stats.recentConversations.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-700">
                            {c.title || 'Sin título'}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {c.message_count} msgs
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-400">{c.user_email}</span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {fmtDateTime(c.last_activity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top users */}
              {stats.topUsers.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold text-slate-600">
                    Usuarios más activos
                  </div>
                  <div className="space-y-1.5">
                    {stats.topUsers.map((u) => (
                      <div
                        key={u.user_id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-700">
                            {u.user_name || u.user_email}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">{u.messages} msgs</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-400">{u.user_email}</span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {u.conversations} convs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Memoria persistente (V2.C.4) ──────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Memoria persistente</h2>
            <p className="text-xs text-slate-500">
              Hechos estructurados (IsaakMemoryFact) y memoria de largo plazo con embeddings
              (IsaakLongTermMemory) que Isaak ha recopilado sobre este tenant.
            </p>
          </div>
          {memory && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                {memory.totals.facts} hechos
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                {memory.totals.longTerm} long-term
              </span>
            </div>
          )}
        </div>

        {loadingMemory ? (
          <p className="text-xs text-slate-400">Cargando memoria…</p>
        ) : !memory || (memory.facts.length === 0 && memory.longTerm.length === 0) ? (
          <p className="text-xs text-slate-400 italic">Sin memoria registrada para este tenant.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Hechos estructurados ({memory.facts.length} mostrados)
              </h3>
              <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                {memory.facts.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/40 px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-slate-700">
                        {f.category}.{f.factKey}
                      </span>
                      <span className="text-[9px] text-slate-400">{f.source}</span>
                    </div>
                    <div className="mt-0.5 break-all text-slate-600">
                      {(() => {
                        try {
                          const v = f.valueJson;
                          if (typeof v === 'string') return v;
                          return JSON.stringify(v);
                        } catch {
                          return '—';
                        }
                      })()}
                    </div>
                  </li>
                ))}
                {memory.facts.length === 0 && (
                  <li className="text-[11px] italic text-slate-400">Sin hechos</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Long-term memory ({memory.longTerm.length} mostrados)
              </h3>
              <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                {memory.longTerm.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/40 px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="rounded bg-violet-100 px-1.5 text-[9px] font-bold uppercase text-violet-700">
                        {m.factType}
                      </span>
                      <span className="text-[9px] text-slate-400">{m.source}</span>
                    </div>
                    <div className="mt-0.5 text-slate-600 line-clamp-3">{m.fact}</div>
                  </li>
                ))}
                {memory.longTerm.length === 0 && (
                  <li className="text-[11px] italic text-slate-400">Sin long-term</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── White-label ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">White-label de Isaak</h2>
            <p className="text-xs text-slate-500">
              Personaliza la marca de Isaak para este tenant. Logo, colores y nombre empresa.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
            <div
              role="switch"
              aria-checked={config.enabled ?? false}
              onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                config.enabled ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  config.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            Activado
          </label>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Cargando configuración…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Nombre empresa (sustituye &quot;Isaak&quot;)
                </label>
                <input
                  type="text"
                  value={config.companyName ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, companyName: e.target.value || undefined }))
                  }
                  placeholder="Ej: Asesores García AI"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Color primario (hex)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    title="Color primario"
                    value={config.primaryColor ?? DEFAULT_COLOR}
                    onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value }))}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                  />
                  <input
                    type="text"
                    value={config.primaryColor ?? DEFAULT_COLOR}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, primaryColor: e.target.value || undefined }))
                    }
                    placeholder="#2361d8"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  URL del logo (imagen)
                </label>
                <input
                  type="url"
                  value={config.logoUrl ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, logoUrl: e.target.value || undefined }))
                  }
                  placeholder="https://ejemplo.com/logo.png"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Email de soporte personalizado
                </label>
                <input
                  type="email"
                  value={config.supportEmail ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, supportEmail: e.target.value || undefined }))
                  }
                  placeholder="soporte@miempresa.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  URL del favicon (opcional)
                </label>
                <input
                  type="url"
                  value={config.faviconUrl ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, faviconUrl: e.target.value || undefined }))
                  }
                  placeholder="https://ejemplo.com/favicon.ico"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.hidePoweredBy ?? false}
                    onChange={(e) => setConfig((c) => ({ ...c, hidePoweredBy: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />
                  Ocultar &quot;Powered by Verifactu&quot;
                </label>
              </div>
            </div>

            {/* Preview */}
            {config.enabled && (config.logoUrl || config.companyName || config.primaryColor) && (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-semibold text-slate-500">
                  Vista previa sidebar
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5"
                  style={{ backgroundColor: (config.primaryColor ?? DEFAULT_COLOR) + '18' }}
                >
                  {config.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={config.logoUrl}
                      alt="logo"
                      className="h-6 w-6 rounded object-contain"
                    />
                  )}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: config.primaryColor ?? DEFAULT_COLOR }}
                  >
                    {config.companyName || 'Isaak'}
                  </span>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            {saved && <p className="mt-3 text-xs text-emerald-600">Guardado correctamente.</p>}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
