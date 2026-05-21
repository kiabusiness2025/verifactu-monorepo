// GET /api/isaak/chift/callback
//
// Chift redirects here after the user connects (or fails to connect) their accounting software.
// Query params: consumerId, connectionId, connectionStatus
//
// On success: updates ExternalConnection to 'connected' and stores connectionId.
// On failure: marks as 'error'.

import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { decryptHoldedSecret } from '@/app/lib/holded-integration';
import { getChiftFolders } from '@/app/lib/chift-client';

export const runtime = 'nodejs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaak.verifactu.business';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const consumerId = searchParams.get('consumerId');
  const connectionId = searchParams.get('connectionId');
  const connectionStatus = searchParams.get('connectionStatus');

  const integrationsUrl = `${APP_URL}/integrations`;

  if (!consumerId) {
    return NextResponse.redirect(`${integrationsUrl}?chift=error&reason=missing_consumer`);
  }

  if (connectionStatus !== 'connected') {
    // User cancelled or error — mark pending → error
    await prisma.externalConnection
      .updateMany({
        where: { provider: 'chift', connectionStatus: 'pending' },
        data: {
          connectionStatus: 'error',
          lastError: `Chift returned status: ${connectionStatus ?? 'unknown'}`,
        },
      })
      .catch(() => null);
    return NextResponse.redirect(`${integrationsUrl}?chift=cancelled`);
  }

  try {
    // Find the ExternalConnection by consumerId stored in apiKeyEnc
    const connections = await prisma.externalConnection.findMany({
      where: { provider: 'chift', connectionStatus: { in: ['pending', 'connected'] } },
    });

    const conn = connections.find((c) => {
      if (!c.apiKeyEnc) return false;
      try {
        return decryptHoldedSecret(c.apiKeyEnc) === consumerId;
      } catch {
        return false;
      }
    });

    if (!conn) {
      return NextResponse.redirect(`${integrationsUrl}?chift=error&reason=unknown_consumer`);
    }

    // Optionally fetch folder info for display (non-blocking)
    let companyIdentity: Record<string, unknown> | null = null;
    try {
      const folders = await getChiftFolders(consumerId);
      if (folders.length > 0) {
        const f = folders[0];
        companyIdentity = {
          name: f.name,
          vat: f.vat,
          currency: f.main_currency,
          companyNumber: f.company_number,
        };
      }
    } catch {
      // Not critical — continue without company info
    }

    await prisma.externalConnection.update({
      where: { id: conn.id },
      data: {
        connectionStatus: 'connected',
        providerAccountId: connectionId ?? null,
        connectedAt: new Date(),
        lastError: null,
        companyIdentityJson: (companyIdentity ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.redirect(`${integrationsUrl}?chift=connected`);
  } catch (err) {
    console.error('[chift/callback] error', err);
    return NextResponse.redirect(`${integrationsUrl}?chift=error&reason=internal`);
  }
}
