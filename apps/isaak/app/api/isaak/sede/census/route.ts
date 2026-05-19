import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getAeatCensusData } from '@/app/lib/aeat-sede';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const result = await getAeatCensusData(session.tenantId);

  if (!result.ok && result.error === 'no_cert') {
    return NextResponse.json({ error: 'no_cert' }, { status: 200 });
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Error al consultar la AEAT' },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: result.data });
}
