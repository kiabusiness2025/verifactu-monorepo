import { HoldedDirectSessionsSection } from '@/components/admin/HoldedDirectControlSections';
import { listHoldedDirectActiveSessions } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectSessionsPage() {
  const sessions = await listHoldedDirectActiveSessions(40);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Sesiones activas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Usuarios con sesión web abierta y conexión activa a Holded por el canal ChatGPT.
        </p>
      </header>

      <HoldedDirectSessionsSection
        title="Sesiones activas"
        description="Visión de sesiones abiertas y tenants afectados."
        sessions={sessions}
      />
    </main>
  );
}
