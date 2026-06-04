import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { HoldedDirectSessionsSection } from '@/components/admin/HoldedDirectControlSections';
import { listHoldedDirectActiveSessions } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectSessionsPage() {
  const sessions = await listHoldedDirectActiveSessions(40);

  return (
    <main className="space-y-6">
      <Link
        href="/connectors"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-3 w-3" />
        Conexiones MCP
      </Link>
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
