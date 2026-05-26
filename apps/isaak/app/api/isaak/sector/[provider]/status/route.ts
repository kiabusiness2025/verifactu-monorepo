import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getSectorStatus, isSectorProvider } from '@/app/lib/sector-connector';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const { provider } = await params;
  if (!isSectorProvider(provider)) {
    return NextResponse.json({ error: 'Proveedor no soportado.' }, { status: 400 });
  }

  const status = await getSectorStatus(session.tenantId, provider);
  return NextResponse.json(status);
}
