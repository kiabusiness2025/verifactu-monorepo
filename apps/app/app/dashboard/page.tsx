import Link from 'next/link';

import { DashboardHome } from '@/components/dashboard/DashboardHome';
import { IsaakContextBridge } from '@/components/isaak/IsaakContextBridge';
import { getDashboardSummary } from '@/src/server/dashboard/getDashboardSummary';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const data = await getDashboardSummary();
    const activeTenant = data.activeTenant ?? data.tenants[0] ?? null;
    const activeTenantId = data.activeTenantId ?? activeTenant?.id ?? null;

    return (
      <div className="space-y-6">
        <IsaakContextBridge
          tenantId={activeTenantId}
          demoMode={data.demoMode}
          moduleKey="dashboard"
          companyName={activeTenant?.name ?? null}
          supportMode={data.supportMode}
          supportSessionId={data.supportSessionId}
        />

        <DashboardHome />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Operativa diaria
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Panel cliente
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Ventas', href: '/dashboard/sales', desc: 'Facturas y presupuestos' },
              { title: 'Gastos (Isaak)', href: '/dashboard/expenses', desc: 'Clasificación y confirmación' },
              { title: 'Impuestos', href: '/dashboard/taxes', desc: '303/130 y libros AEAT' },
              { title: 'Integraciones', href: '/dashboard/integrations', desc: 'Programa contable vía API' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0b6cfb]/30 hover:shadow-md"
              >
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Empresas
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {data.tenants.length > 0 ? 'Activa' : 'Sin empresa'}
            </span>
          </div>

          {data.tenants.length === 0 ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-xs font-semibold text-blue-900">¿Quieres usar tus datos reales?</p>
              <p className="mt-1 text-xs text-blue-800">
                Añade tu empresa con el buscador y activa ahora tu prueba de 30 días.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/onboarding?step=company&next=/dashboard"
                  className="inline-flex h-8 items-center rounded-full bg-[#0b6cfb] px-3 text-xs font-semibold text-white hover:bg-[#095edb]"
                >
                  Buscar empresa
                </Link>
                <Link
                  href="/dashboard/onboarding?step=billing&next=/dashboard"
                  className="inline-flex h-8 items-center rounded-full border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                >
                  Activar prueba 30 días
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">NIF</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tenants.map((tenant) => {
                    const isActive = tenant.id === activeTenantId;
                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{tenant.name}</td>
                        <td className="px-4 py-3 text-slate-600">{tenant.nif || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              'rounded-full px-2 py-1 text-xs font-semibold',
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
                            ].join(' ')}
                          >
                            {isActive ? 'Activa' : 'Disponible'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard?tenant=${tenant.id}`}
                            className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Isaak en acción
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Recomendado
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
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
                    className="inline-flex h-8 items-center rounded-full bg-[#0b6cfb]/10 px-3 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
                  >
                    {item.action}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('[dashboard] render failed', {
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
}
