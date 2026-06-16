/**
 * POST /api/isaak/banking/gcbd/connect
 *
 * Step 1: Start a GoCardless Bank Account Data requisition.
 * Creates an End User Agreement and a Requisition for the chosen institution,
 * then returns the bank authorization URL (redirect the user there).
 *
 * Body: { institutionId: string }
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { createAgreement, createRequisition } from '@verifactu/integrations/gocardless-bank-data';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { institutionId?: string };
  if (!body.institutionId) {
    return NextResponse.json({ error: 'institutionId requerido.' }, { status: 400 });
  }

  try {
    // Create End User Agreement (90 days history, 90 days validity)
    const agreement = await createAgreement({
      institutionId: body.institutionId,
      maxHistoricalDays: 90,
      accessValidForDays: 90,
    });

    // Build redirect URL pointing back to our callback
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
    const redirectUrl = `${appUrl}/api/isaak/banking/gcbd/callback`;

    // Create requisition — returns a link to redirect the user to
    const requisition = await createRequisition({
      institutionId: body.institutionId,
      agreementId: agreement.id,
      redirectUrl,
      reference: `verifactu-${session.tenantId}`,
      userLanguage: 'ES',
    });

    // Persist as pending connection so we can link it after callback
    await prisma.seConnection.upsert({
      where: { id: requisition.id },
      create: {
        id: requisition.id,
        tenantId: session.tenantId,
        seCustomerId: null,
        providerCode: body.institutionId,
        providerName: body.institutionId,
        countryCode: 'ES',
        status: 'pending',
        provider: 'gcbd',
      },
      update: { status: 'pending' },
    });

    return NextResponse.json({
      requisition_id: requisition.id,
      connect_url: requisition.link,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
