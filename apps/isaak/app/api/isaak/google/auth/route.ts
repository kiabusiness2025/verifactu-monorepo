import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildGoogleAuthUrl } from '@/app/lib/google-calendar';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google Calendar no está configurado en este entorno.' },
      { status: 503 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ tenantId: session.tenantId, userId: session.userId })
  ).toString('base64url');

  const url = buildGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
