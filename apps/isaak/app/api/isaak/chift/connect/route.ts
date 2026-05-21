// POST /api/isaak/chift/connect
//
// Creates a Chift consumer for the tenant (or reuses existing), then returns
// the connection URL that the frontend should redirect the user to.
// After the user connects their accounting software, Chift redirects to /callback.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  createChiftConsumer,
  getChiftConnectionUrl,
  isChiftConfigured,
} from '@/app/lib/chift-client';
import { encryptHoldedSecret, decryptHoldedSecret } from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

const CALLBACK_URL =
  process.env.CHIFT_CALLBACK_URL ??
  `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaak.verifactu.business'}/api/isaak/chift/callback`;

export async function POST() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  if (!isChiftConfigured()) {
    return NextResponse.json(
      { error: 'Chift no está configurado en este entorno.' },
      { status: 503 }
    );
  }

  const { tenantId, userId } = session;

  try {
    // Reuse existing pending/connected ExternalConnection if present
    let conn = await prisma.externalConnection.findFirst({
      where: { tenantId, provider: 'chift', connectionStatus: { in: ['pending', 'connected'] } },
      orderBy: { createdAt: 'desc' },
    });

    let consumerId: string;

    if (conn?.apiKeyEnc) {
      consumerId = decryptHoldedSecret(conn.apiKeyEnc);
    } else {
      // Create a new Chift consumer for this tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      const consumer = await createChiftConsumer(
        tenant?.name ?? `tenant-${tenantId}`,
        CALLBACK_URL
      );
      consumerId = consumer.id;

      // Upsert the ExternalConnection record (status: pending until callback confirms)
      conn = await prisma.externalConnection.upsert({
        where: {
          tenantId_provider_channelKey: { tenantId, provider: 'chift', channelKey: 'dashboard' },
        },
        create: {
          tenantId,
          provider: 'chift',
          channelKey: 'dashboard',
          credentialType: 'oauth',
          apiKeyEnc: encryptHoldedSecret(consumerId),
          connectionStatus: 'pending',
          connectedByUserId: userId,
        },
        update: {
          apiKeyEnc: encryptHoldedSecret(consumerId),
          connectionStatus: 'pending',
          connectedByUserId: userId,
          disconnectedAt: null,
          lastError: null,
        },
      });
    }

    const url = await getChiftConnectionUrl(consumerId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[chift/connect] error', err);
    return NextResponse.json({ error: 'Error al iniciar conexión con Chift.' }, { status: 500 });
  }
}
