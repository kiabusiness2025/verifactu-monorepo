'use client';

/**
 * F6.3 — Search bar admin para encontrar tenants/usuarios por nombre o empresa.
 *
 * UX: input controlado con debounce (350ms). Resultados en dos paneles
 * (Tenants / Usuarios) con accesos directos a la pagina de conectores del
 * tenant. Si el query es < 2 chars, no se muestra nada.
 *
 * Se monta encima de /admin/tenants index, debajo de las KPI cards.
 */

import { adminGet } from '@/lib/adminApi';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type TenantHit = {
  id: string;
  name: string | null;
  legalName: string | null;
  nif: string | null;
  totalConnections: number;
  connected: number;
  errors: number;
  channels: string[];
  lastActivityAt: string | null;
};

type UserHit = {
  id: string;
  email: string | null;
  name: string | null;
  totalConnections: number;
  connected: number;
  tenants: Array<{ tenantId: string; legalName: string | null }>;
  lastActivityAt: string | null;
};

type SearchResponse = {
  query: string;
  tenants: TenantHit[];
  users: UserHit[];
};

const CHANNEL_BADGE: Record<string, string> = {
  dashboard: 'bg-slate-100 text-slate-700 border-slate-200',
  chatgpt: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mobile: 'bg-sky-50 text-sky-700 border-sky-200',
  claude: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return value;
  }
}

export function HoldedConnectorsSearch() {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce 350ms.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(input.trim()), 350);
    return () => window.clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    if (debounced.length < 2) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGet<SearchResponse>(`/api/admin/connectors/search?q=${encodeURIComponent(debounced)}`)
      .then((response) => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error en la busqueda');
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const showResults = useMemo(() => debounced.length >= 2, [debounced]);
  const showHint = debounced.length > 0 && debounced.length < 2;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Buscar tenant o usuario
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nombre de empresa, usuario, email o NIF/CIF…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            autoComplete="off"
          />
          {input ? (
            <button
              type="button"
              onClick={() => setInput('')}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Busca por nombre completo del usuario, razon social del tenant, email o NIF/CIF. Minimo 2
          caracteres.
        </p>
      </div>

      {showHint ? <p className="text-xs text-slate-500">Escribe al menos 2 caracteres…</p> : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {showResults && !error ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Tenants */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-end justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Empresas ({data?.tenants.length ?? 0})
              </h3>
              {loading ? <span className="text-[10px] text-slate-400">cargando…</span> : null}
            </div>
            <div className="mt-2">
              {data?.tenants.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.tenants.map((tenant) => (
                    <li key={tenant.id} className="py-2">
                      <Link
                        href={`/tenants/${tenant.id}/connectors`}
                        className="group flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800 group-hover:text-slate-950">
                            {tenant.legalName ?? tenant.name ?? tenant.id.slice(0, 8)}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                            {tenant.nif ? <span>{tenant.nif}</span> : null}
                            {tenant.channels.map((channel) => (
                              <span
                                key={channel}
                                className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold ${
                                  CHANNEL_BADGE[channel] ??
                                  'border-slate-200 bg-slate-100 text-slate-700'
                                }`}
                              >
                                {channel}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <div className="font-mono tabular-nums text-slate-800">
                            {tenant.connected}/{tenant.totalConnections}
                          </div>
                          {tenant.errors > 0 ? (
                            <div className="text-rose-600">{tenant.errors} err</div>
                          ) : null}
                          <div className="text-[10px] text-slate-400">
                            {formatDate(tenant.lastActivityAt)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-2 text-xs text-slate-500">Ningun tenant coincidente.</p>
              )}
            </div>
          </div>

          {/* Users */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-end justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Usuarios ({data?.users.length ?? 0})
              </h3>
              {loading ? <span className="text-[10px] text-slate-400">cargando…</span> : null}
            </div>
            <div className="mt-2">
              {data?.users.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.users.map((user) => (
                    <li key={user.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {user.name ?? user.email ?? user.id.slice(0, 8)}
                          </div>
                          {user.email && user.email !== user.name ? (
                            <div className="truncate text-[11px] text-slate-500">{user.email}</div>
                          ) : null}
                          {user.tenants.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {user.tenants.map((tenant) => (
                                <Link
                                  key={tenant.tenantId}
                                  href={`/tenants/${tenant.tenantId}/connectors`}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  {tenant.legalName ?? tenant.tenantId.slice(0, 8)}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <div className="font-mono tabular-nums text-slate-800">
                            {user.connected}/{user.totalConnections}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(user.lastActivityAt)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-2 text-xs text-slate-500">Ningun usuario coincidente.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
