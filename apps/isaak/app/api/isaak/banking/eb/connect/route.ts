/**
 * POST /api/isaak/banking/eb/connect
 *
 * Step 1: Start an Enable Banking authorization flow.
 * Generates a CSRF state token, calls POST /auth to get the bank redirect URL,
 * persists a pending SeConnection keyed by state, and returns the redirect URL.
 *
 * Body: { aspspName: string; country?: string }
 * Returns: { connect_url: string; state: string }
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { startEbAuth } from '@verifactu/integrations/enable-banking';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    aspspName?: string;
    country?: string;
  };

  if (!body.aspspName) {
    return NextResponse.json({ error: 'aspspName requerido.' }, { status: 400 });
  }

  const country = body.country ?? 'ES';
  const state = randomUUID();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const redirectUrl = `${appUrl}/api/isaak/banking/eb/callback`;

  try {
    const auth = await startEbAuth({
      aspspName: body.aspspName,
      country,
      redirectUrl,
      state,
    });

    // Persist pending connection keyed by state so callback can look it up
    await prisma.seConnection.upsert({
      where: { id: state },
      create: {
        id: state,
        tenantId: session.tenantId,
        seCustomerId: null,
        providerCode: body.aspspName,
        providerName: body.aspspName,
        countryCode: country,
        status: 'pending',
        provider: 'enablebanking',
      },
      update: { status: 'pending' },
    });

    return NextResponse.json({ connect_url: auth.url, state });
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}
