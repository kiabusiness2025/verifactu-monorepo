import { HoldedDirectTenantsSection } from '@/components/admin/HoldedDirectControlSections';
import { HoldedConnectorsKpiCards } from '@/components/admin/HoldedConnectorsKpiCards';
import { HoldedConnectorsSearch } from '@/components/admin/HoldedConnectorsSearch';
import { listHoldedDirectTenants } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectTenantsPage() {
  const tenants = await listHoldedDirectTenants(40);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Tenants del conector</h1>
        <p className="mt-2 text-sm text-slate-600">
          Empresas con conexion o historial operativo del canal Holded.
        </p>
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
