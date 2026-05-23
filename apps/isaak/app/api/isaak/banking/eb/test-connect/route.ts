/**
 * GET /api/isaak/banking/eb/test-connect?aspsp=BBVA&country=ES
 * Temporary sandbox test route — redirects directly to bank auth URL.
 * Remove once Enable Banking is verified end-to-end.
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { startEbAuth } from '@verifactu/integrations/enable-banking';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const aspspName = request.nextUrl.searchParams.get('aspsp') ?? 'BBVA';
  const country = request.nextUrl.searchParams.get('country') ?? 'ES';

  const state = randomUUID();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const redirectUrl = `${origin}/api/isaak/banking/eb/callback`;

  const auth = await startEbAuth({ aspspName, country, redirectUrl, state });

  await prisma.seConnection.upsert({
    where: { id: state },
    create: {
      id: state,
      tenantId: session.tenantId,
      seCustomerId: null,
      providerCode: aspspName,
      providerName: aspspName,
      countryCode: country,
      status: 'pending',
      provider: 'enablebanking',
    },
    update: { status: 'pending' },
  });

  return NextResponse.redirect(auth.url);
}
