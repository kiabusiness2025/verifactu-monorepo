'use client';

import { DashboardSkeleton } from '@/components/accessibility/LoadingSkeleton';
import { adminGet, type AccountingData } from '@/lib/adminApi';
import { formatCurrency, formatDateTime, formatNumber, formatTime } from '@/src/lib/formatters';
import {
    AlertTriangle,
    ArrowUpRight,
    Building,
    DollarSign,
    FileWarning,
    ListChecks,
    RefreshCw,
    TrendingUp,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export const dynamic = 'force-dynamic';

type OverviewTotals = AccountingData['totals'];

export default function AdminDashboardPage() {
  const [totals, setTotals] = useState<OverviewTotals | null>(null);
  const [tenantCount, setTenantCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [recentTenants, setRecentTenants] = useState<
    Array<{ id: string; legalName: string; createdAt?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [accounting, tenantsResponse, usersResponse] = await Promise.all([
          adminGet<AccountingData>('/api/admin/accounting?period=current_month'),
          adminGet<{
            items: Array<{ id: string; legalName: string; createdAt?: string }>;
            total: number;
          }>('/api/admin/tenants?page=1&pageSize=5'),
          adminGet<{ users: Array<{ id: string }> }>('/api/admin/users'),
        ]);

        if (mounted) {
          setTotals(accounting.totals);
          setTenantCount(tenantsResponse.total || 0);
          setUserCount(usersResponse.users?.length || 0);
          setRecentTenants(tenantsResponse.items || []);
          setStatus('ok');
          setLastCheckedAt(formatTime(new Date()));
        }
      } catch (error) {
        if (mounted) {
          setStatus('error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const incidents = useMemo(
    () => [
      {
        id: 'webhooks',
        title: 'Webhooks',
        description: 'Sin incidencias críticas en las últimas 24h.',
      },
      {
        id: 'verifactu',
        title: 'Veri*Factu',
        description: 'Sin errores críticos registrados.',
      },
      {
        id: 'emails',
        title: 'Emails',
        description: 'Sin rebotes recientes detectados.',
      },
    ],
    []
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Control Tower</div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className="h-3.5 w-3.5" />
          {lastCheckedAt ? `Actualizado ${lastCheckedAt}` : 'Actualizando...'}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Visión global</h2>
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Usuarios</p>
                <p className="text-2xl font-semibold text-slate-900">{formatNumber(userCount)}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Tenants activos</p>
                <p className="text-2xl font-semibold text-slate-900">{formatNumber(tenantCount)}</p>
              </div>
              <Building className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Ingresos mes</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatCurrency(totals?.revenue || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {formatNumber(totals?.invoices || 0)} facturas emitidas
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Beneficio</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatCurrency(totals?.profit || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-700" />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Margen{' '}
              {totals?.revenue
                ? (((totals.revenue - totals.expenses) / totals.revenue) * 100).toFixed(1)
                : '0.0'}
              %
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Acciones rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/admin/companies/new"
            className="rounded-xl bg-blue-600 px-4 py-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 text-center"
          >
            + Crear empresa
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="rounded-xl border-2 border-[#0b6cfb] px-4 py-4 text-sm font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/10 text-center"
          >
            Ver todos los usuarios
          </Link>
          <Link
            href="/dashboard/admin/emails"
            className="rounded-xl border-2 border-purple-500 px-4 py-4 text-sm font-semibold text-purple-600 hover:bg-purple-50 text-center"
          >
            Revisar correos
          </Link>
          <Link
            href="/integrations/stripe"
            className="rounded-xl border-2 border-emerald-500 px-4 py-4 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 text-center"
          >
            Ver suscripciones
          </Link>
          <Link
            href="/support-sessions"
            className="rounded-xl border-2 border-slate-300 px-4 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-center"
          >
            Sesiones de soporte
          </Link>
          <Link
            href="/operations"
            className="rounded-xl border-2 border-amber-400 px-4 py-4 text-sm font-semibold text-amber-700 hover:bg-amber-50 text-center"
          >
            Incidencias
          </Link>
          <Link
            href="/dashboard/admin/integrations"
            className="rounded-xl border-2 border-slate-400 px-4 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-center"
          >
            Integraciones
          </Link>
          <Link
            href="/dashboard/admin/chat"
            className="rounded-xl border-2 border-blue-400 px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 text-center"
          >
            Hablar con Isaak
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Incidencias</h3>
            <FileWarning className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 space-y-3">
            {incidents.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                  <span className="text-[10px] uppercase text-emerald-600">OK</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Actividad reciente</h3>
            <ListChecks className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 space-y-2">
            {recentTenants.length === 0 ? (
              <div className="text-xs text-slate-500">Sin actividad reciente.</div>
            ) : (
              recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs"
                >
                  <div className="truncate text-slate-700">{tenant.legalName}</div>
                  <div className="text-slate-400">
                    {tenant.createdAt ? formatDateTime(tenant.createdAt) : '--'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Colas y tareas</h3>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-500">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
              <span>Jobs fallidos</span>
              <span className="text-slate-700">0</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
              <span>Webhooks en cola</span>
              <span className="text-slate-700">0</span>
            </div>
            <Link
              href="/operations"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Ver operaciones <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {status === 'error' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          No se pudieron cargar algunas métricas. Reintenta en unos segundos.
        </div>
      ) : null}
    </div>
  );
}
