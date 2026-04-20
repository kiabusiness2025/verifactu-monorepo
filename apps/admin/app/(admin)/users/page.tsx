import { HoldedDirectUsersSection } from '@/components/admin/HoldedDirectControlSections';
import { listHoldedDirectUsers } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectUsersPage() {
  const users = await listHoldedDirectUsers(40);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios del conector</h1>
        <p className="mt-2 text-sm text-slate-600">
          Estado de conexión por usuario y tenants relacionados con Holded + ChatGPT.
        </p>
      </header>

      <HoldedDirectUsersSection
        title="Usuarios"
        description="Listado de usuarios conectados o desconectados con su actividad reciente."
        users={users}
      />
    </main>
  );
}
