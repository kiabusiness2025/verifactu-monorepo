// V3.4 — Audit log de acciones del copilot Isaak admin.
//
// Muestra cada admin_* tool ejecutada (confirm=true) con quién, cuándo,
// qué tool, qué argumentos. Reusa UsageEvent (source='isaak_copilot').

import { listCopilotActions } from '@/lib/isaakCopilotAudit';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TOOL_LABELS: Record<string, string> = {
  admin_extend_trial: 'Extender trial',
  admin_change_plan: 'Cambiar plan',
  admin_cancel_subscription: 'Cancelar suscripción',
  admin_impersonate_user: 'Suplantar usuario',
};

const TOOL_BADGE: Record<string, string> = {
  admin_extend_trial: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  admin_change_plan: 'border-blue-200 bg-blue-50 text-blue-700',
  admin_cancel_subscription: 'border-rose-200 bg-rose-50 text-rose-700',
  admin_impersonate_user: 'border-purple-200 bg-purple-50 text-purple-700',
};

function fmtArgs(args: Record<string, unknown>): string {
  const keysToShow = Object.keys(args).filter((k) => k !== 'confirm');
  const parts = keysToShow.map((k) => {
    const v = args[k];
    return `${k}=${typeof v === 'string' ? v.slice(0, 40) : String(v)}`;
  });
  return parts.join(' · ');
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'hace segundos';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export default async function CopilotAuditPage() {
  const actions = await listCopilotActions(200);

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Acciones del copilot Isaak</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cada vez que el copilot ejecuta una acción admin_* (extender trial, cambiar plan,
          cancelar, suplantar) queda registrada aquí. Sirve para auditoría y rollback.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Cuándo
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Acción
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Admin
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tenant
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Args
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {actions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  El copilot todavía no ha ejecutado ninguna acción.
                </td>
              </tr>
            ) : (
              actions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    <div>{new Date(a.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</div>
                    <div className="text-[10px] text-slate-400">{relativeTime(a.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        TOOL_BADGE[a.tool] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {TOOL_LABELS[a.tool] ?? a.tool}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{a.adminEmail}</td>
                  <td className="px-4 py-3 text-xs">
                    {a.tenantId ? (
                      <Link
                        href={`/tenants/${a.tenantId}/overview`}
                        className="font-mono text-[#2361d8] hover:underline"
                      >
                        {a.tenantId.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                    {fmtArgs(a.args)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
