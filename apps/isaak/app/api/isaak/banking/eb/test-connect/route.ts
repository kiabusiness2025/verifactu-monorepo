/**
 * GET /api/isaak/banking/eb/test-connect?aspsp=BBVA&country=ES
 * Temporary sandbox test route — shows debug info and connect URL.
 * Remove once Enable Banking is verified end-to-end.
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { startEbAuth } from '@verifactu/integrations/enable-banking';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const steps: Record<string, unknown> = {};

  try {
    // Step 1: session
    const session = await getHoldedSession().catch(() => null);
    steps.session = session?.tenantId ? 'ok' : 'no session';
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'No session', steps }, { status: 401 });
    }

    const aspspName = request.nextUrl.searchParams.get('aspsp') ?? 'BBVA';
    const country = request.nextUrl.searchParams.get('country') ?? 'ES';
    const state = randomUUID();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const redirectUrl = `${origin}/api/isaak/banking/eb/callback`;

    steps.params = { aspspName, country, state, redirectUrl };

    // Step 2: Enable Banking auth
    const auth = await startEbAuth({ aspspName, country, redirectUrl, state });
    steps.ebAuth = 'ok';
    steps.connectUrl = auth.url;

    // Step 3: DB upsert
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
    steps.db = 'ok';

    // Return JSON with clickable link instead of auto-redirect
    return NextResponse.json({
      ok: true,
      connect_url: auth.url,
      steps,
      instructions: 'Abre connect_url en el navegador para autorizar el banco',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 5) : [];
    return NextResponse.json({ error: message, stack, steps }, { status: 500 });
  }
}
