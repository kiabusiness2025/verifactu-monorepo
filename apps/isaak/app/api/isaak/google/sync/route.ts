import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getValidAccessToken, syncFiscalDeadlinesToCalendar } from '@/app/lib/google-calendar';
import { getFiscalDeadlines } from '@/app/lib/fiscal-calendar';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { year?: number };
  const year = typeof body.year === 'number' ? body.year : new Date().getFullYear();

  const accessToken = await getValidAccessToken(session.tenantId, session.userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Conecta Google Calendar primero desde Ajustes → Conexiones.' },
      { status: 400 }
    );
  }

  const deadlines = getFiscalDeadlines(year);
  const result = await syncFiscalDeadlinesToCalendar(accessToken, deadlines).catch((e: Error) => ({
    created: 0,
    skipped: 0,
    errors: deadlines.length,
    detail: e.message,
  }));

  return NextResponse.json({ ok: true, year, ...result });
}
