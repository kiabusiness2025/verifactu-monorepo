import { HoldedDirectUsersSection } from '@/components/admin/HoldedDirectControlSections';
import { listHoldedDirectUsers } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectUsersPage() {
  const users = await listHoldedDirectUsers(40);

  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-soft sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Usuarios del conector
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Estado de conexion por usuario y tenants relacionados con el canal Holded.
          </p>
        </div>
      </header>

      <HoldedDirectUsersSection
        title="Usuarios"
        description="Listado de usuarios conectados o desconectados con su actividad reciente."
        users={users}
      />
    </main>
  );
}
