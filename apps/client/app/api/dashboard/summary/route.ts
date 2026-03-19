import { NextResponse } from 'next/server';
import { getSessionPayload } from '../../../../lib/session';
import { getClientDashboardSummary } from '../../../../src/server/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'Sesión no disponible' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId')?.trim() ?? '';
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });
    }

    const summary = await getClientDashboardSummary(session, tenantId);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('[client/dashboard/summary] GET error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar el resumen del dashboard' },
      { status: 500 }
    );
  }
}