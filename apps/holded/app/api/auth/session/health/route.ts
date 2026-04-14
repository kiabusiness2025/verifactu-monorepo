import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getHoldedSession();
  const subjectUid = typeof session?.payload?.uid === 'string' ? session.payload.uid : null;

  if (!session?.tenantId || !subjectUid) {
    return NextResponse.json(
      {
        ok: false,
        hasSession: false,
        error: 'No hay una sesion compartida activa.',
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    hasSession: true,
    session: {
      uid: subjectUid,
      email: session.email ?? null,
      tenantId: session.tenantId,
      name: session.name ?? null,
    },
  });
}
