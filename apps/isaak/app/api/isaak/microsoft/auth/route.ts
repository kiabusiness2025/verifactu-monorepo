import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildMicrosoftAuthUrl, isMicrosoftConfigured } from '@/app/lib/microsoft-oauth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  if (!isMicrosoftConfigured()) {
    return NextResponse.json(
      { error: 'Microsoft 365 no está configurado en este entorno.' },
      { status: 503 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ tenantId: session.tenantId, userId: session.userId })
  ).toString('base64url');

  const url = buildMicrosoftAuthUrl(state);
  return NextResponse.redirect(url);
}
