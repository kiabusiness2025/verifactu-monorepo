// V2.A.5 — Vista global de empresas (tenants).
//
// Antes solo listaba tenants conectados vía ChatGPT MCP. Ahora muestra
// TODOS los tenants enriquecidos con: plan activo, Holded conectado,
// nº de miembros y última actividad (UsageEvent.createdAt máx.).
//
// Filtros: plan, holded sí/no, isDemo, búsqueda por nombre/NIF.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trial: 'border-amber-200 bg-amber-50 text-amber-700',
  past_due: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
  paused: 'border-blue-200 bg-blue-50 text-blue-700',
  incomplete: 'border-orange-200 bg-orange-50 text-orange-700',
};

function fmtDate(value: Date | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(value);
}

function daysSince(value: Date | null): string {
  if (!value) return '';
  const d = Math.floor((Date.now() - value.getTime()) / 86_400_000);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d}d`;
  return `hace ${Math.floor(d / 30)}m`;
}

type Filters = {
  search: string;
  holded: 'all' | 'connected' | 'disconnected';
  status: string;
  demo: 'all' | 'real' | 'demo';
  page: number;
};

async function loadData(filters: Filters) {
  // Filtros base sobre Tenant
  const tenantWhere: Record<string, unknown> = {};
  if (filters.search) {
    tenantWhere.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { nif: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.demo === 'real') tenantWhere.isDemo = false;
  if (filters.demo === 'demo') tenantWhere.isDemo = true;

  const [tenants, totalCount] = await Promise.all([
    prisma.tenant.findMany({
      where: tenantWhere,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: filters.page * PAGE_SIZE,
      select: {
        id: true,
        name: true,
        nif: true,
        isDemo: true,
        createdAt: true,
        tenantSubscriptions: {
          where: { status: { in: ['active', 'trial', 'past_due', 'paused'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: { select: { name: true, code: true } } },
        },
        externalConnections: {
          where: { provider: 'holded', connectionStatus: 'connected' },
          take: 1,
          select: { id: true, connectionStatus: true },
        },
        _count: { select: { users: true } },
      },
    }),
    prisma.tenant.count({ where: tenantWhere }),
  ]);

  // Última actividad: max UsageEvent.createdAt por tenant (batch).
  const tenantIds = tenants.map((t) => t.id);
  const lastActivities = tenantIds.length
    ? await prisma.usageEvent.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _max: { createdAt: true },
      })
    : [];
  const lastActivityMap = new Map<string, Date>();
  for (const row of lastActivities) {
    if (row.tenantId && row._max.createdAt) {
      lastActivityMap.set(row.tenantId, row._max.createdAt);
    }
  }

  // Aplicamos filtros que requieren info derivada
  let filtered = tenants.map((t) => ({
    ...t,
    hasHolded: t.externalConnections.length > 0,
    lastActivity: lastActivityMap.get(t.id) ?? null,
    subscription: t.tenantSubscriptions[0] ?? null,
  }));

  if (filters.holded === 'connected') filtered = filtered.filter((t) => t.hasHolded);
  if (filters.holded === 'disconnected') filtered = filtered.filter((t) => !t.hasHolded);
  if (filters.status) filtered = filtered.filter((t) => t.subscription?.status === filters.status);

  return { tenants: filtered, total: totalCount };
}

type PageProps = {
  searchParams: Promise<{
    search?: string;
    holded?: string;
    status?: string;
    demo?: string;
    page?: string;
  }>;
};

export default async function TenantsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters: Filters = {
    search: (sp.search ?? '').trim(),
    holded: sp.holded === 'connected' || sp.holded === 'disconnected' ? sp.holded : 'all',
    status: sp.status ?? '',
    demo: sp.demo === 'real' || sp.demo === 'demo' ? sp.demo : 'all',
    page: Math.max(0, Number(sp.page ?? '0') || 0),
  };

  const { tenants, total } = await loadData(filters);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildHref = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.holded !== 'all') params.set('holded', filters.holded);
    if (filters.status) params.set('status', filters.status);
    if (filters.demo !== 'all') params.set('demo', filters.demo);
    if (filters.page > 0) params.set('page', String(filters.page));
    for (const [k, v] of Object.entries(extra)) {
      if (v === '' || v === 0) params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/tenants?${qs}` : '/tenants';
  };

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Todos los tenants con su plan activo, conexión Holded y última actividad.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Buscar
          </label>
          <input
            name="search"
            type="text"
            defaultValue={filters.search}
            placeholder="Nombre o NIF…"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Holded
          </label>
          <select
            name="holded"
            defaultValue={filters.holded}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="connected">Conectado</option>
            <option value="disconnected">Sin conectar</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Suscripción
          </label>
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="">Cualquiera</option>
            <option value="active">Activa</option>
            <option value="trial">Trial</option>
            <option value="past_due">Impago</option>
            <option value="paused">Pausada</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Tipo
          </label>
          <select
            name="demo"
            defaultValue={filters.demo}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="real">Reales</option>
            <option value="demo">Demo</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Filtrar
        </button>
        {(filters.search || filters.holded !== 'all' || filters.status || filters.demo !== 'all') && (
          <Link
            href="/tenants"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Empresa
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Plan
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Holded
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                Miembros
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                Última actividad
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay empresas que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{t.name}</span>
                      {t.isDemo && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
                          demo
                        </span>
                      )}
                    </div>
                    {t.nif && <div className="text-[11px] text-slate-500">NIF: {t.nif}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {t.subscription ? (
                      <>
                        <div className="font-medium text-slate-800">{t.subscription.plan.name}</div>
                        <span
                          className={`mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[10px] font-semibold ${
                            STATUS_BADGE[t.subscription.status] ??
                            'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {t.subscription.status}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">sin suscripción</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.hasHolded ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ● Conectado
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">
                    {t._count.users}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">
                    {t.lastActivity ? (
                      <>
                        {fmtDate(t.lastActivity)}{' '}
                        <span className="text-slate-400">({daysSince(t.lastActivity)})</span>
                      </>
                    ) : (
                      <span className="italic text-slate-400">sin actividad</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tenants/${t.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Detalle →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <span>
              Página {filters.page + 1} de {totalPages} · {total} empresas
            </span>
            <div className="flex items-center gap-1.5">
              {filters.page > 0 && (
                <Link
                  href={buildHref({ page: filters.page - 1 })}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              )}
              {filters.page + 1 < totalPages && (
                <Link
                  href={buildHref({ page: filters.page + 1 })}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
