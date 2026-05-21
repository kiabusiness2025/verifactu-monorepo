import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { isMicrosoftConfigured } from '@/app/lib/microsoft-oauth';
import { getFiscalDeadlines } from '@/app/lib/fiscal-calendar';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const token = await prisma.isaakMicrosoftToken
    .findUnique({
      where: { tenantId_userId: { tenantId: session.tenantId, userId: session.userId } },
      select: { email: true, displayName: true, createdAt: true, expiresAt: true, scopes: true },
    })
    .catch(() => null);

  const scopes = token?.scopes ?? '';
  const upcoming = getFiscalDeadlines(new Date().getFullYear())
    .filter((d) => {
      const days = Math.ceil((d.date.getTime() - Date.now()) / 86_400_000);
      return days >= 0 && days <= 90;
    })
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      title: d.title,
      modelo: d.modelo,
      date: d.date.toISOString().slice(0, 10),
      daysUntil: Math.ceil((d.date.getTime() - Date.now()) / 86_400_000),
    }));

  return NextResponse.json({
    connected: !!token,
    email: token?.email ?? null,
    displayName: token?.displayName ?? null,
    connectedAt: token?.createdAt?.toISOString() ?? null,
    hasCalendarScope: scopes.includes('Calendars'),
    hasMailScope: scopes.includes('Mail.Read'),
    hasSendScope: scopes.includes('Mail.Send'),
    hasOneDriveScope: scopes.includes('Files'),
    upcoming,
    microsoftConfigured: isMicrosoftConfigured(),
  });
}
