import { requireAdminSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { CampaignForm } from './CampaignForm';

export const dynamic = 'force-dynamic';

type CountRow = { count: number };

export default async function AdminMarketingPage() {
  await requireAdminSession();

  const [allUsers, holdedConnected, holdedError] = await Promise.all([
    query<CountRow>(
      `SELECT COUNT(DISTINCT u.id)::int AS count
       FROM users u
       WHERE u."isBlocked" = false`,
      []
    ),
    query<CountRow>(
      `SELECT COUNT(DISTINCT u.id)::int AS count
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       JOIN external_connections ec ON ec.tenant_id = m.tenant_id
       WHERE ec.provider = 'holded'
         AND ec.connection_status = 'connected'
         AND u."isBlocked" = false`,
      []
    ),
    query<CountRow>(
      `SELECT COUNT(DISTINCT u.id)::int AS count
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       JOIN external_connections ec ON ec.tenant_id = m.tenant_id
       WHERE ec.provider = 'holded'
         AND ec.connection_status = 'error'
         AND u."isBlocked" = false`,
      []
    ),
  ]);

  const segments = [
    {
      value: 'all_users' as const,
      label: 'Todos los usuarios',
      count: allUsers[0]?.count ?? 0,
    },
    {
      value: 'holded_connected' as const,
      label: 'Conectados a Holded',
      count: holdedConnected[0]?.count ?? 0,
    },
    {
      value: 'holded_error' as const,
      label: 'Error en Holded',
      count: holdedError[0]?.count ?? 0,
    },
  ];

  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marketing</h1>
        <p className="mt-0.5 text-sm text-slate-500">Envía campañas de email por segmento</p>
      </header>

      {/* Segment stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {segments.map((s) => (
          <div
            key={s.value}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft"
          >
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {s.count.toLocaleString('es-ES')}
            </p>
          </div>
        ))}
      </div>

      {/* Compose */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Nueva campaña</h2>
        <CampaignForm segments={segments} />
      </div>
    </main>
  );
}
