import { requireAdminSession } from '@/lib/auth';
import { prisma, query } from '@/lib/db';
import type { MarketingCampaign } from '@prisma/client';
import { CampaignForm } from './CampaignForm';
import { RemindersWidget } from './RemindersWidget';

export const dynamic = 'force-dynamic';

type CountRow = { count: number };

export default async function AdminMarketingPage() {
  await requireAdminSession();

  const [allUsers, holdedConnected, holdedError, recentCampaigns] = await Promise.all([
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
    prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
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
    <main className="space-y-8 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marketing</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Campañas de email por segmento · Recordatorios automáticos de perfil
        </p>
      </header>

      {/* Recordatorios automáticos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Recordatorios de perfil incompleto
        </h2>
        <RemindersWidget />
      </section>

      {/* Segment stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Campañas manuales
        </h2>
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
      </section>

      {/* Compose */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Nueva campaña</h2>
        <CampaignForm segments={segments} />
      </div>

      {/* History */}
      {recentCampaigns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Historial de campañas
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Segmento</th>
                  <th className="px-4 py-3 text-left">Asunto</th>
                  <th className="px-4 py-3 text-right">Enviados</th>
                  <th className="px-4 py-3 text-right">Fallidos</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCampaigns.map((c: MarketingCampaign) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">
                      {c.createdAt.toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {c.segment}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-700">{c.subject}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">
                      {c.sentCount.toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {c.failCount > 0 ? (
                        <span className="text-red-500">{c.failCount.toLocaleString('es-ES')}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.sentBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
