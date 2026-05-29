// Estado consolidado de los 4 canales de notificación (email / push / WhatsApp /
// Telegram) para el panel /ajustes/notificaciones.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const tenantId = session.tenantId;
  const userId = session.userId;

  const [pushSubCount, pushPrefs, waThread, tgChat] = await Promise.all([
    prisma.isaakPushSubscription.count({ where: { tenantId, userId } }),
    prisma.isaakPushPreferences.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: {
        alertaFiscal: true,
        documentoSinConciliar: true,
        avisoProactivoIsaak: true,
      },
    }),
    prisma.whatsAppThread.findFirst({
      where: { tenantId, consentAt: { not: null } },
      orderBy: { lastMessageAt: 'desc' },
      select: { phoneNumber: true, lastMessageAt: true, consentAt: true },
    }),
    prisma.telegramChat.findFirst({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      select: { chatId: true, username: true, firstName: true, lastMessageAt: true },
    }),
  ]);

  return NextResponse.json({
    email: {
      address: session.email ?? null,
      enabled: true,
    },
    push: {
      subscribed: pushSubCount > 0,
      preferences: {
        alertaFiscal: pushPrefs?.alertaFiscal ?? true,
        documentoSinConciliar: pushPrefs?.documentoSinConciliar ?? true,
        avisoProactivoIsaak: pushPrefs?.avisoProactivoIsaak ?? true,
      },
    },
    whatsapp: {
      linked: !!waThread,
      phone: waThread?.phoneNumber ?? null,
      lastActivityAt: waThread?.lastMessageAt?.toISOString() ?? null,
      consentAt: waThread?.consentAt?.toISOString() ?? null,
    },
    telegram: {
      linked: !!tgChat,
      chatId: tgChat ? Number(tgChat.chatId) : null,
      username: tgChat?.username ?? null,
      firstName: tgChat?.firstName ?? null,
      lastActivityAt: tgChat?.lastMessageAt?.toISOString() ?? null,
    },
  });
}
