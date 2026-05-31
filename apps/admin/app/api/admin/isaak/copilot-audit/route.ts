// V3.4 — Listado de acciones ejecutadas por el copilot Isaak admin.
//
// GET /api/admin/isaak/copilot-audit?limit=100

import { requireAdmin } from '@/lib/adminAuth';
import { listCopilotActions } from '@/lib/isaakCopilotAudit';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;
    const actions = await listCopilotActions(limit);
    return NextResponse.json({ actions });
  } catch (err) {
    if (err instanceof Error && err.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
