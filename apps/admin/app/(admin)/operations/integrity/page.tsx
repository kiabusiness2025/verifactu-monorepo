'use client';

import { adminGet } from '@/lib/adminApi';
import { AlertTriangle, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type DiagnosticsResponse = {
  ok: boolean;
  filters: { q: string; limit: number };
  summary: {
    orphan_memberships: number;
    invalid_preferences: number;
    users_without_memberships: number;
    tenants_without_owners: number;
  };
  issues: {
    orphanMemberships: Array<{
      membership_id: string;
      user_id: string;
      email: string | null;
      tenant_id: string;
      tenant_name: string | null;
      status: string;
      role: string;
      created_at: string;
      missing_user: boolean;
      missing_tenant: boolean;
    }>;
    invalidPreferences: Array<{
      user_id: string;
      email: string | null;
      preferred_tenant_id: string;
      tenant_name: string | null;
      tenant_exists: boolean;
      has_active_membership: boolean;
      updated_at: string | null;
    }>;
    usersWithoutMemberships: Array<{
      user_id: string;
      email: string;
      name: string | null;
      created_at: string;
    }>;
    tenantsWithoutOwners: Array<{
      tenant_id: string;
      tenant_name: string;
      legal_name: string | null;
      nif: string | null;
      created_at: string;
    }>;
  };
};

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default function IntegrityDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/admin/integrity/user-tenant?q=${encodeURIComponent(query)}&limit=100`;
        const response = await adminGet<DiagnosticsResponse>(url);
        if (!active) return;
        setData(response);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar diagnóstico');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [query]);

  const totalFindings = useMemo(() => {
    if (!data) return 0;
    const s = data.summary;
    return (
      s.orphan_memberships +
      s.invalid_preferences +
      s.users_without_memberships +
      s.tenants_without_owners
    );
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Integridad Usuarios vs Tenants</h1>
            <p className="mt-1 text-sm text-slate-600">
              Comprueba relaciones rotas entre usuarios, memberships, tenants y preferencias.
            </p>
          </div>
          <div
            className={[
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
              totalFindings > 0
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
            ].join(' ')}
          >
            {totalFindings > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {totalFindings > 0 ? `${totalFindings} incidencias` : 'Sin incidencias'}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filtrar por email, tenant o id..."
              className="h-9 w-72 rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            onClick={() => setQuery(searchInput.trim())}
            className="inline-flex h-9 items-center rounded-lg bg-[#0b6cfb] px-3 text-sm font-semibold text-white hover:bg-[#095edb]"
          >
            Filtrar
          </button>
          <button
            onClick={() => setQuery(query)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </header>

      {loading ? <div className="text-sm text-slate-600">Cargando diagnóstico...</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {data ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Memberships huérfanas" value={data.summary.orphan_memberships} />
            <SummaryCard title="Preferred tenant inválido" value={data.summary.invalid_preferences} />
            <SummaryCard title="Usuarios sin membership" value={data.summary.users_without_memberships} />
            <SummaryCard title="Tenants sin owner activo" value={data.summary.tenants_without_owners} />
          </section>

          <IssueTable
            title="Memberships huérfanas"
            rows={data.issues.orphanMemberships}
            empty="Sin memberships huérfanas"
            columns={['membership', 'email', 'tenant', 'estado', 'alta']}
            renderRow={(row) => (
              <>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.membership_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-slate-700">{row.email ?? '—'}</td>
                <td className="px-3 py-2 text-slate-700">{row.tenant_name ?? row.tenant_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-xs">
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 ring-1 ring-amber-200">
                    {row.missing_user ? 'user missing' : ''}
                    {row.missing_user && row.missing_tenant ? ' + ' : ''}
                    {row.missing_tenant ? 'tenant missing' : ''}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(row.created_at)}</td>
              </>
            )}
          />

          <IssueTable
            title="Preferred tenant inválido"
            rows={data.issues.invalidPreferences}
            empty="Sin preferencias inválidas"
            columns={['user', 'preferred tenant', 'tenant existe', 'membresía activa', 'actualizado']}
            renderRow={(row) => (
              <>
                <td className="px-3 py-2 text-slate-700">{row.email ?? row.user_id.slice(0, 8)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.preferred_tenant_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-slate-700">{row.tenant_exists ? 'sí' : 'no'}</td>
                <td className="px-3 py-2 text-slate-700">{row.has_active_membership ? 'sí' : 'no'}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(row.updated_at)}</td>
              </>
            )}
          />

          <IssueTable
            title="Usuarios sin memberships activas"
            rows={data.issues.usersWithoutMemberships}
            empty="Sin usuarios sin membership"
            columns={['email', 'nombre', 'id', 'alta']}
            renderRow={(row) => (
              <>
                <td className="px-3 py-2 text-slate-700">{row.email}</td>
                <td className="px-3 py-2 text-slate-700">{row.name ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.user_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(row.created_at)}</td>
              </>
            )}
          />

          <IssueTable
            title="Tenants sin owner activo"
            rows={data.issues.tenantsWithoutOwners}
            empty="Sin tenants sin owner"
            columns={['tenant', 'razón social', 'nif', 'alta']}
            renderRow={(row) => (
              <>
                <td className="px-3 py-2 text-slate-700">{row.tenant_name}</td>
                <td className="px-3 py-2 text-slate-700">{row.legal_name ?? '—'}</td>
                <td className="px-3 py-2 text-slate-700">{row.nif ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(row.created_at)}</td>
              </>
            )}
          />
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </article>
  );
}

function IssueTable<T extends { [k: string]: unknown }>({
  title,
  rows,
  empty,
  columns,
  renderRow,
}: {
  title: string;
  rows: T[];
  empty: string;
  columns: string[];
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-3 py-2">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index}>{renderRow(row)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
