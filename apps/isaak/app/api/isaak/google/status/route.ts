import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { getUpcomingDeadlines } from '@/app/lib/fiscal-calendar';
import { hasDriveScope } from '@/app/lib/google-drive';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const token = await prisma.isaakGoogleToken
    .findUnique({
      where: { tenantId_userId: { tenantId: session.tenantId, userId: session.userId } },
      select: { email: true, createdAt: true, expiresAt: true, scopes: true },
    })
    .catch(() => null);

  const hasGmailScope = token?.scopes
    ? token.scopes.includes('https://www.googleapis.com/auth/gmail.readonly')
    : false;
  const hasDrive = token?.scopes ? hasDriveScope(token.scopes) : false;

  const upcoming = getUpcomingDeadlines(90).map((d) => ({
    id: d.id,
    title: d.title,
    modelo: d.modelo,
    date: d.date.toISOString().slice(0, 10),
    daysUntil: Math.ceil((d.date.getTime() - Date.now()) / 86_400_000),
    category: d.category,
  }));

  return NextResponse.json({
    connected: !!token,
    email: token?.email ?? null,
    connectedAt: token?.createdAt?.toISOString() ?? null,
    hasGmailScope,
    hasDriveScope: hasDrive,
    upcoming,
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}
