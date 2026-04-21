import {
  HoldedDirectTenantsSection,
  HoldedDirectUsersSection,
} from '@/components/admin/HoldedDirectControlSections';
import { getHoldedDirectPanelData } from '@/lib/holdedDirectAdmin';
import { formatDateTime } from '@/src/lib/formatters';

export const dynamic = 'force-dynamic';

const anchors = [
  { href: '#usuarios', label: 'Usuarios' },
  { href: '#tenants', label: 'Tenants' },
];

export default async function HoldedDirectPanelPage() {
  const [data, refreshedAt] = await Promise.all([
    getHoldedDirectPanelData({
      userLimit: 8,
      tenantLimit: 8,
      conversationLimit: 0,
      sessionLimit: 0,
    }),
    Promise.resolve(new Date().toISOString()),
  ]);

  return (
    <main className="space-y-6">
      <header className="rounded-[32px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Panel del canal Holded
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Usuarios y tenants
            </h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Vista operativa centrada solo en usuarios con actividad y tenants relacionados con el
              conector de Holded.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Actualizado {formatDateTime(refreshedAt)}
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {anchors.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </a>
          ))}
        </div>
      </header>

      <HoldedDirectUsersSection
        id="usuarios"
        title="Usuarios del conector"
        description="Quien mantiene conexion activa o desconectada y sobre que tenants opera."
        users={data.users}
        viewAllHref="/users"
      />

      <HoldedDirectTenantsSection
        id="tenants"
        title="Tenants con actividad"
        description="Estado por empresa, ultima validacion y usuarios relacionados."
        tenants={data.tenants}
        viewAllHref="/tenants"
      />
    </main>
  );
}
