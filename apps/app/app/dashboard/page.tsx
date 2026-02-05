import Link from 'next/link';

import { SectionTitle } from '@verifactu/ui';

import { Building2, Plus } from 'lucide-react';

import { formatCurrency } from '@/src/lib/formatters';

import { getDashboardSummary } from '@/src/server/dashboard/getDashboardSummary';

import { IsaakContextBridge } from '@/components/isaak/IsaakContextBridge';

const exercises = [
  { id: '2026', label: 'Ejercicio 2026' },

  { id: '2025', label: 'Ejercicio 2025' },

  { id: '2024', label: 'Ejercicio 2024' },
];

export default async function DashboardPage() {
  let data;

  try {
    data = await getDashboardSummary();
  } catch (error) {
    console.error('[dashboard] getDashboardSummary failed', {
      message: error instanceof Error ? error.message : String(error),

      stack: error instanceof Error ? error.stack : undefined,
    });

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="text-sm font-semibold text-slate-900">No se pudo cargar el dashboard</div>

        <div className="mt-2 text-xs text-slate-500">
          Reintenta en unos segundos. Si el error persiste, contacta con soporte.
        </div>
      </div>
    );
  }

  const activeTenant = data.activeTenant ?? data.tenants[0] ?? null;

  const activeTenantId = data.activeTenantId ?? activeTenant?.id ?? null;

  const demoMode = data.demoMode;

  const currentYear = new Date().getFullYear().toString();

  const exerciseLabel =
    exercises.find((item) => item.id === currentYear)?.label ?? `Ejercicio ${currentYear}`;

  const tenants = data.tenants.length
    ? data.tenants
    : [
        {
          id: 'demo',

          name: 'Empresa Demo SL',

          nif: 'B12345678',

          legalName: null,

          isDemo: true,
        },
      ];

  const tenantStatus = demoMode ? 'Demo' : 'Activa';

  return (
    <div className="space-y-6">
      <IsaakContextBridge
        tenantId={activeTenantId}
        demoMode={demoMode}
        moduleKey="dashboard"
        companyName={activeTenant?.name ?? null}
        supportMode={data.supportMode}
        supportSessionId={data.supportSessionId}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs tracking-[0.35em] text-slate-400">INICIO</div>

          <div className="mt-1 text-lg font-semibold text-[#011c67]">
            Hola, {data.user?.name ?? 'Usuario'}
          </div>

          <div className="mt-2 text-sm text-slate-500">
            Resumen de tu empresa y acciones rápidas para hoy.
          </div>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Ver ajustes
        </Link>
      </div>

      <SectionTitle
        title="Tus empresas"
        right={
          <Link
            href="/dashboard/onboarding?next=/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir empresa
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-4">
        <div className="shadow-soft rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 space-y-4">
            <div className="text-sm font-semibold text-slate-900">Perfiles</div>

            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
              {tenants.map((company) => {
                const active = company.id === activeTenantId;

                const statusLabel = company.isDemo ? 'Demo' : 'Activa';

                return (
                  <Link
                    key={company.id}
                    href={`/dashboard?tenant=${company.id}`}
                    className={`block w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-[#2361d8] bg-[#2361d8]/5'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{company.name}</div>

                        {company.nif ? (
                          <div className="text-xs text-slate-500">NIF {company.nif}</div>
                        ) : null}
                      </div>

                      <span className="rounded-full border px-2 py-0.5 text-[10px] text-slate-500">
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-[#2361d8] font-medium">Ver perfil</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="shadow-soft rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#2361d8]/10 border border-[#2361d8]/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#2361d8]" />
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {activeTenant?.name ?? 'Empresa Demo SL'}
                  </div>

                  {activeTenant?.nif ? (
                    <div className="text-xs text-slate-500">NIF {activeTenant.nif}</div>
                  ) : null}
                </div>
              </div>

              <span className="rounded-full border px-2 py-0.5 text-[10px] text-slate-500">
                {tenantStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
              <span>{exerciseLabel} · Cifras estimadas</span>

              <select
                defaultValue={currentYear}
                className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">Ventas</div>

                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(data.metrics.sales)}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">Gastos</div>

                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(data.metrics.expenses)}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">
                  Beneficio
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {formatCurrency(data.metrics.profit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionTitle title="Acciones con Isaak" />

      <div className="shadow-soft rounded-2xl border border-slate-200 bg-white">
        <div className="p-4 space-y-3">
          {data.actions.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>

                <div className="text-xs text-slate-500">
                  Isaak preparará la acción y el borrador.
                </div>
              </div>

              <Link
                href={item.href}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#2361d8]/20 bg-[#2361d8]/10 px-4 text-xs font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/20"
              >
                {item.action}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
