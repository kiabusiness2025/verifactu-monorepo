import { HoldedDirectTenantsSection } from '@/components/admin/HoldedDirectControlSections';
import { HoldedConnectorsKpiCards } from '@/components/admin/HoldedConnectorsKpiCards';
import { HoldedConnectorsSearch } from '@/components/admin/HoldedConnectorsSearch';
import { listHoldedDirectTenants } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectTenantsPage() {
  const tenants = await listHoldedDirectTenants(40);

  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-soft sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Tenants del conector
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Empresas con conexion o historial operativo del canal Holded.
          </p>
        </div>
      </header>

      {/* F6.2a — KPIs globales del conector (todos los canales). */}
      <HoldedConnectorsKpiCards />

      {/* F6.3 — Busqueda por nombre de empresa o usuario. */}
      <HoldedConnectorsSearch />

      <HoldedDirectTenantsSection
        title="Tenants"
        description="Estado operativo por empresa, usuarios relacionados y ultima actividad visible."
        tenants={tenants}
      />
    </main>
  );
}
