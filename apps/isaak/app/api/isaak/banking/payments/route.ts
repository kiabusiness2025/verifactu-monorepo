/**
 * GET  /api/isaak/banking/payments  → lista pagos del tenant
 * POST /api/isaak/banking/payments  → crea un nuevo pago con mandato activo
 */
import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { createPayment, getPayment } from '@verifactu/integrations/gocardless-payments';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const payments = await prisma.gcPayment.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    mandate_id?: string;
    amount_cents?: number;
    currency?: string;
    description?: string;
    reference?: string;
    charge_date?: string;
  } | null;

  if (!body?.mandate_id || !body.amount_cents) {
    return NextResponse.json({ error: 'Se requieren mandate_id y amount_cents.' }, { status: 400 });
  }

  // Verify mandate belongs to this tenant
  const mandate = await prisma.gcMandate.findFirst({
    where: { id: body.mandate_id, tenantId: session.tenantId },
  });

  if (!mandate) {
    return NextResponse.json({ error: 'Mandato no encontrado.' }, { status: 404 });
  }

  if (mandate.status !== 'active') {
    return NextResponse.json(
      { error: `El mandato no está activo (estado: ${mandate.status}).` },
      { status: 409 }
    );
  }

  try {
    const gcPayment = await createPayment({
      mandate_id: body.mandate_id,
      amount: body.amount_cents,
      currency: body.currency ?? 'EUR',
      description: body.description,
      reference: body.reference,
      charge_date: body.charge_date,
    });

    const saved = await prisma.gcPayment.create({
      data: {
        id: gcPayment.id,
        tenantId: session.tenantId,
        mandateId: gcPayment.links.mandate,
        amountCents: gcPayment.amount,
        currency: gcPayment.currency,
        chargeDate: gcPayment.charge_date,
        status: gcPayment.status,
        description: gcPayment.description ?? undefined,
        reference: gcPayment.reference ?? undefined,
      },
    });

    return NextResponse.json({ payment: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
