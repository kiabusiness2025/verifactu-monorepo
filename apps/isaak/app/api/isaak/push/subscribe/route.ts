import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PushSubscriptionPayload | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Payload de suscripción inválido.' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') ?? undefined;

  await prisma.isaakPushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      tenantId: session.tenantId,
      userId: session.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    },
    update: {
      tenantId: session.tenantId,
      userId: session.userId,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}
