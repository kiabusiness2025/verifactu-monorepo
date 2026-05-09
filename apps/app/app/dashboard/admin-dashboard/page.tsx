'use client';

import { useEffect, useState } from 'react';
import { adminGet, type AccountingData } from '@/lib/adminApi';
import { formatCurrency, formatNumber, formatTime } from '@/src/lib/formatters';
import { TrendingUp, Building, DollarSign, Users, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

type OverviewTotals = AccountingData['totals'];

type TenantRow = {
  membershipId: string;
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  tenantLegalName: string;
  connectionStatus: string;
  channelKey: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  updatedAt: string | null;
  highGovernanceRisk: boolean;
};

type TenantsResponse = {
  items: TenantRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function ChannelBadge({ channel }: { channel: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    chatgpt: { label: 'ChatGPT', color: 'bg-green-100 text-green-700' },
    claude: { label: 'Claude', color: 'bg-amber-100 text-amber-700' },
    dashboard: { label: 'Panel', color: 'bg-blue-100 text-blue-700' },
    mobile: { label: 'Mobile', color: 'bg-purple-100 text-purple-700' },
  };
  const entry = map[channel ?? ''] ?? {
    label: channel ?? '—',
    color: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${entry.color}`}>
      {entry.label}
    </span>
  );
}

function formatRelative(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'hace <1h';
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `hace ${diffD}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function AdminDashboardPage() {
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [financialError, setFinancialError] = useState(false);

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantsTotal, setTenantsTotal] = useState(0);
  const [tenantsConnected, setTenantsConnected] = useState(0);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantsError, setTenantsError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    adminGet<AccountingData>('/api/admin/accounting?period=current_month')
      .then((data) => {
        if (mounted) {
          setTotals(data.totals);
          setFinancialError(false);
        }
      })
      .catch(() => {
        if (mounted) setFinancialError(true);
      })
      .finally(() => {
        if (mounted) setFinancialLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setTenantsLoading(true);
    const params = new URLSearchParams({
      status: statusFilter,
      pageSize: '50',
      sort: 'updated_desc',
    });
    if (searchQ.trim()) params.set('q', searchQ.trim());

    adminGet<TenantsResponse>(`/api/integrations/accounting/admin/user-tenants?${params}`)
      .then((data) => {
        if (!mounted) return;
        setTenants(data.items);
        setTenantsTotal(data.total);
        setTenantsError(false);
        setLastCheckedAt(formatTime(new Date()));
      })
      .catch(() => {
        if (mounted) setTenantsError(true);
      })
      .finally(() => {
        if (mounted) setTenantsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [statusFilter, searchQ, refreshKey]);

  // Separate call to get connected count for the stats bar
  useEffect(() => {
    adminGet<TenantsResponse>(
      '/api/integrations/accounting/admin/user-tenants?status=connected&pageSize=1'
    )
      .then((data) => setTenantsConnected(data.total))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Financial quick stats ── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Estadísticas financieras (mes actual)
        </h2>
        {financialLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : financialError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            Error cargando estadísticas financieras
          </div>
        ) : totals ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                label: 'Ingresos',
                value: formatCurrency(totals.revenue || 0),
                icon: <DollarSign className="h-6 w-6 text-blue-600" />,
                bg: 'bg-blue-50',
              },
              {
                label: 'Gastos',
                value: formatCurrency(totals.expenses || 0),
                icon: <Building className="h-6 w-6 text-red-600" />,
                bg: 'bg-red-50',
              },
              {
                label: 'Beneficio',
                value: formatCurrency(totals.profit || 0),
                icon: <TrendingUp className="h-6 w-6 text-green-600" />,
                bg: 'bg-green-50',
              },
              {
                label: 'Facturas',
                value: formatNumber(totals.invoices || 0),
                icon: <Users className="h-6 w-6 text-purple-600" />,
                bg: 'bg-purple-50',
              },
            ].map(({ label, value, icon, bg }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                  </div>
                  <div className={`rounded-lg ${bg} p-3`}>{icon}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Connector connections ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Conexiones Holded</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {lastCheckedAt && <span>Actualizado: {lastCheckedAt}</span>}
            <button
              type="button"
              aria-label="Actualizar conexiones"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-3">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total empresas</p>
              <p className="text-xl font-bold text-slate-900">
                {tenantsLoading ? '…' : formatNumber(tenantsTotal)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-3">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Conectadas</p>
              <p className="text-xl font-bold text-green-700">
                {tenantsLoading ? '…' : formatNumber(tenantsConnected)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-3">
              <WifiOff className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Desconectadas</p>
              <p className="text-xl font-bold text-red-600">
                {tenantsLoading ? '…' : formatNumber(Math.max(0, tenantsTotal - tenantsConnected))}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            {(['all', 'connected', 'disconnected'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 font-medium ${statusFilter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {f === 'all' ? 'Todas' : f === 'connected' ? 'Conectadas' : 'Desconectadas'}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Buscar empresa o email…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="flex-1 max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Table */}
        {tenantsLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 animate-pulse">
            Cargando…
          </div>
        ) : tenantsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            Error cargando conexiones
          </div>
        ) : tenants.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Sin resultados
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Empresa
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Usuario
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Canal
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Última actividad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((row) => (
                  <tr key={row.membershipId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 truncate max-w-[180px]">
                        {row.tenantName || '—'}
                      </p>
                      {row.tenantLegalName && row.tenantLegalName !== row.tenantName && (
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">
                          {row.tenantLegalName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 truncate max-w-[200px]">
                        {row.userEmail || '—'}
                      </p>
                      {row.userName && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {row.userName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          row.connectionStatus === 'connected'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.connectionStatus === 'connected' ? (
                          <Wifi className="h-3 w-3" />
                        ) : (
                          <WifiOff className="h-3 w-3" />
                        )}
                        {row.connectionStatus === 'connected' ? 'Conectada' : 'Desconectada'}
                      </span>
                      {row.highGovernanceRisk && (
                        <span className="ml-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Riesgo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={row.channelKey} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatRelative(row.lastSyncAt ?? row.lastValidatedAt ?? row.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tenantsTotal > 50 && (
              <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500 bg-slate-50">
                Mostrando 50 de {tenantsTotal} — usa la búsqueda para filtrar
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
