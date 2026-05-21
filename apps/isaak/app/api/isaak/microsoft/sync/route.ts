import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getValidMicrosoftToken } from '@/app/lib/microsoft-oauth';
import { syncFiscalDeadlinesToOutlook } from '@/app/lib/microsoft-calendar';
import { getFiscalDeadlines } from '@/app/lib/fiscal-calendar';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { year?: number };
  const year = typeof body.year === 'number' ? body.year : new Date().getFullYear();

  const accessToken = await getValidMicrosoftToken(session.tenantId, session.userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Conecta Microsoft 365 primero desde Ajustes → Conexiones.' },
      { status: 400 }
    );
  }

  const deadlines = getFiscalDeadlines(year).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    date: d.date,
  }));

  const result = await syncFiscalDeadlinesToOutlook(
    session.tenantId,
    session.userId,
    deadlines
  ).catch((e: Error) => ({
    created: 0,
    skipped: 0,
    errors: deadlines.length,
    detail: e.message,
  }));

  return NextResponse.json({ ok: true, year, ...result });
}
