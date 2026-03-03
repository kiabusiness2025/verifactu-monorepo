'use client';

import { DashboardSkeleton } from '@/components/accessibility/LoadingSkeleton';
import { adminGet } from '@/lib/adminApi';
import { formatDateTime, formatNumber, formatTime } from '@/src/lib/formatters';
import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  Link2,
  Mail,
  RefreshCw,
  Shield,
  Users,
  UserSearch,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export const dynamic = 'force-dynamic';

type TenantsResponse = {
  items: Array<{ id: string; legalName: string; createdAt?: string }>;
  total: number;
};

type UsersResponse = {
  users: Array<{ id: string }>;
};

type SubscriptionsResponse = {
  items: Array<{ id: string; status: string }>;
};

type IntegritySummary = {
  orphan_memberships: number;
  invalid_preferences: number;
  users_without_memberships: number;
  tenants_without_owners: number;
};

type IntegrityResponse = {
  summary: IntegritySummary;
};

type SupportSessionsResponse = {
  items: Array<{ id: string; endedAt: string | null }>;
};

export default function AdminDashboardPage() {
  const [tenantCount, setTenantCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [activeSupportSessions, setActiveSupportSessions] = useState(0);
  const [recentTenants, setRecentTenants] = useState<
    Array<{ id: string; legalName: string; createdAt?: string }>
  >([]);
  const [integritySummary, setIntegritySummary] = useState<IntegritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [tenantsResponse, usersResponse, subscriptionsResponse, integrityResponse, supportResponse] =
          await Promise.all([
            adminGet<TenantsResponse>('/api/admin/tenants?page=1&pageSize=6'),
            adminGet<UsersResponse>('/api/admin/users'),
            adminGet<SubscriptionsResponse>('/api/admin/subscriptions?limit=500'),
            adminGet<IntegrityResponse>('/api/admin/integrity/user-tenant?limit=5'),
            adminGet<SupportSessionsResponse>('/api/admin/support-sessions?status=active&limit=200'),
          ]);

        if (mounted) {
          setTenantCount(tenantsResponse.total || 0);
          setUserCount(usersResponse.users?.length || 0);
          setSubscriptionCount(subscriptionsResponse.items?.length || 0);
          setActiveSupportSessions(supportResponse.items?.length || 0);
          setRecentTenants(tenantsResponse.items || []);
          setIntegritySummary(integrityResponse.summary || null);
          setStatus('ok');
          setLastCheckedAt(formatTime(new Date()));
        }
      } catch (_error) {
        if (mounted) setStatus('error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const integrityTotal = useMemo(() => {
    if (!integritySummary) return 0;
    return (
      integritySummary.orphan_memberships +
      integritySummary.invalid_preferences +
      integritySummary.users_without_memberships +
      integritySummary.tenants_without_owners
    );
  }, [integritySummary]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Admin Hub</div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión global</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className="h-3.5 w-3.5" />
          {lastCheckedAt ? `Actualizado ${lastCheckedAt}` : 'Actualizando...'}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Usuarios" value={formatNumber(userCount)} icon={<Users className="h-7 w-7 text-blue-500" />} />
        <MetricCard
          label="Empresas"
          value={formatNumber(tenantCount)}
          icon={<Building2 className="h-7 w-7 text-indigo-500" />}
        />
        <MetricCard
          label="Suscripciones"
          value={formatNumber(subscriptionCount)}
          icon={<CircleDollarSign className="h-7 w-7 text-emerald-500" />}
        />
        <MetricCard
          label="Soporte activo"
          value={formatNumber(activeSupportSessions)}
          icon={<Shield className="h-7 w-7 text-violet-500" />}
        />
        <MetricCard
          label="Incidencias U/T"
          value={formatNumber(integrityTotal)}
          icon={<UserSearch className="h-7 w-7 text-amber-500" />}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Módulos de administración</h2>
        <p className="mt-1 text-xs text-slate-500">
          Centro para operar usuarios, empresas, roles, suscripciones e integraciones. La
          facturación de negocio vive dentro de cada tenant.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink href="/users" label="Usuarios" help="Editar usuarios, roles y acceso tenant" />
          <QuickLink href="/tenants" label="Empresas" help="Crear, suspender, borrar y operar tenants" />
          <QuickLink href="/subscriptions" label="Suscripciones" help="Planes, trial y ciclo comercial" />
          <QuickLink href="/integrations" label="Integraciones" help="API contable, correo y conectores" />
          <QuickLink href="/integrations/resend" label="Correo" help="Eventos, rebotes y entrega" icon={<Mail className="h-4 w-4" />} />
          <QuickLink href="/operations/integrity" label="Usuarios vs Tenants" help="Detectar y resolver inconsistencias" icon={<Link2 className="h-4 w-4" />} />
          <QuickLink href="/support-sessions" label="Soporte" help="Entrar a tenant y asistir al cliente" />
          <QuickLink href="/settings" label="Configuración" help="Preferencias y parámetros globales" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Empresas recientes</h3>
            <Link href="/tenants" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Ver todas
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentTenants.length === 0 ? (
              <div className="text-xs text-slate-500">Sin altas recientes.</div>
            ) : (
              recentTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs"
                >
                  <div className="truncate text-slate-700">{tenant.legalName}</div>
                  <div className="text-slate-400">
                    {tenant.createdAt ? formatDateTime(tenant.createdAt) : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Integridad usuarios/tenants</h3>
            <Link
              href="/operations/integrity"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Abrir diagnóstico
            </Link>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <IntegrityLine
              label="Memberships huérfanas"
              value={integritySummary?.orphan_memberships ?? 0}
            />
            <IntegrityLine
              label="Preferred tenant inválido"
              value={integritySummary?.invalid_preferences ?? 0}
            />
            <IntegrityLine
              label="Usuarios sin membership activa"
              value={integritySummary?.users_without_memberships ?? 0}
            />
            <IntegrityLine
              label="Tenants sin owner activo"
              value={integritySummary?.tenants_without_owners ?? 0}
            />
          </div>
        </div>
      </section>

      {status === 'error' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          No se pudieron cargar algunas métricas. Reintenta en unos segundos.
        </div>
      ) : null}

      {integrityTotal > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Hay incidencias entre usuarios y empresas pendientes de revisión.
          </div>
          <div className="mt-1">
            Revísalas desde{' '}
            <Link href="/operations/integrity" className="underline">
              Integridad U/T
            </Link>
            .
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-600">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        {icon}
      </div>
    </article>
  );
}

function QuickLink({
  href,
  label,
  help,
  icon,
}: {
  href: string;
  label: string;
  help: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-slate-300 hover:bg-white"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xs text-slate-500">{help}</div>
    </Link>
  );
}

function IntegrityLine({ label, value }: { label: string; value: number }) {
  const isOk = value === 0;
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
      <span>{label}</span>
      <span
        className={[
          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
          isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
