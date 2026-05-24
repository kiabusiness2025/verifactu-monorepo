import { getHoldedConnection } from '@/app/lib/holded-integration';
import { holdedListEmployees, holdedListProjects } from '@/app/lib/holded-api';
import { getHoldedSession } from '@/app/lib/holded-session';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/equipo/list?tab=employees|projects */
export async function GET(request: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conn = await getHoldedConnection(session.tenantId);
  if (!conn?.apiKey) {
    return NextResponse.json(
      { ok: false, error: 'No hay conexión Holded activa.' },
      { status: 422 }
    );
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'employees';

  type RawRow = Record<string, unknown>;

  if (tab === 'projects') {
    const raw = (await holdedListProjects(conn.apiKey)) as RawRow[];
    const projects = raw.map((p) => ({
      id: String(p._id ?? p.id ?? ''),
      name: String(p.name ?? ''),
      status: String(p.status ?? ''),
      startDate: p.startDate ? String(p.startDate) : null,
      endDate: p.endDate ? String(p.endDate) : null,
      billable: Boolean(p.billable ?? false),
      budget: p.budget !== undefined ? Number(p.budget) : null,
      totalCost: p.totalCost !== undefined ? Number(p.totalCost) : null,
    }));
    return NextResponse.json({ ok: true, tab: 'projects', projects });
  }

  // employees (default)
  const raw = (await holdedListEmployees(conn.apiKey)) as RawRow[];
  const employees = raw.map((e) => ({
    id: String(e._id ?? e.id ?? ''),
    name: String(e.name ?? ''),
    email: e.email ? String(e.email) : null,
    role: e.role ? String(e.role) : null,
    department: e.department ? String(e.department) : null,
    status: String(e.status ?? 'active'),
    startDate: e.startDate ? String(e.startDate) : null,
  }));
  return NextResponse.json({ ok: true, tab: 'employees', employees });
}
