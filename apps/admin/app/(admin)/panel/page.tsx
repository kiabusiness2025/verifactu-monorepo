import {
  HoldedDirectComplianceSummary,
  HoldedDirectConversationsSection,
  HoldedDirectSessionsSection,
  HoldedDirectSummaryCards,
  HoldedDirectTenantsSection,
  HoldedDirectUsersSection,
} from '@/components/admin/HoldedDirectControlSections';
import HoldedDirectComplianceSync from '@/components/admin/HoldedDirectComplianceSync';
import { getHoldedDirectPanelData } from '@/lib/holdedDirectAdmin';
import { formatDateTime } from '@/src/lib/formatters';

export const dynamic = 'force-dynamic';

const anchors = [
  { href: '#usuarios', label: 'Usuarios' },
  { href: '#tenants', label: 'Tenants' },
  { href: '#conversaciones', label: 'Conversaciones' },
  { href: '#sesiones', label: 'Sesiones' },
];

export default async function HoldedDirectPanelPage() {
  const [data, refreshedAt] = await Promise.all([
    getHoldedDirectPanelData({
      userLimit: 8,
      tenantLimit: 8,
      conversationLimit: 8,
      sessionLimit: 8,
    }),
    Promise.resolve(new Date().toISOString()),
  ]);

  return (
    <main className="space-y-6">
      <HoldedDirectComplianceSync />
      <header className="rounded-[32px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Panel del conector directo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Holded + ChatGPT
            </h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Vista única para observar usuarios conectados o desconectados, tenants activos,
              historial reciente de conversaciones y sesiones abiertas del conector.
            </p>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Los recordatorios de perfiles incompletos se revisan automaticamente al abrir este
              panel.
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

      <HoldedDirectSummaryCards summary={data.summary} />
      <HoldedDirectComplianceSummary summary={data.summary} />

      <HoldedDirectUsersSection
        id="usuarios"
        title="Usuarios del conector"
        description="Quién mantiene conexión activa o desconectada y sobre qué tenants opera."
        users={data.users}
        viewAllHref="/users"
      />

      <HoldedDirectTenantsSection
        id="tenants"
        title="Tenants con rastro del conector"
        description="Estado por empresa, última validación, sincronización y señal de error."
        tenants={data.tenants}
        viewAllHref="/tenants"
      />

      <HoldedDirectConversationsSection
        id="conversaciones"
        title="Historial reciente"
        description="Conversaciones guardadas que pertenecen a tenants del conector directo."
        conversations={data.conversations}
        viewAllHref="/conversations"
      />

      <HoldedDirectSessionsSection
        id="sesiones"
        title="Sesiones activas"
        description="Sesiones web todavía abiertas para usuarios con conexión vigente a Holded."
        sessions={data.sessions}
        viewAllHref="/sessions"
      />
    </main>
  );
}
