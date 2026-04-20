import { HoldedDirectTenantsSection } from '@/components/admin/HoldedDirectControlSections';
import { listHoldedDirectTenants } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectTenantsPage() {
  const tenants = await listHoldedDirectTenants(40);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Tenants del conector</h1>
        <p className="mt-2 text-sm text-slate-600">
          Empresas con conexión o historial operativo del canal directo Holded + ChatGPT.
        </p>
      </header>

      <HoldedDirectTenantsSection
        title="Tenants"
        description="Estado operativo, usuarios, conversaciones y últimas señales de sincronización."
        tenants={tenants}
      />
    </main>
  );
}
