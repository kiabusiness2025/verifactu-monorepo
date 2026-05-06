/**
 * POST /api/isaak/banking/saltedge/connect
 *
 * Paso 1: Inicia el flujo de conexión bancaria con Salt Edge.
 * Crea (o reutiliza) el customer de Salt Edge para este tenant,
 * luego crea una connect session y devuelve la URL de autorización.
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { createConnectSession, createSECustomer } from '@verifactu/integrations/saltedge';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    providerCode?: string;
    fromDate?: string;
  };

  try {
    // 1. Obtener o crear el customer de Salt Edge para este tenant
    let seCustomer = await prisma.seCustomer.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!seCustomer) {
      const created = await createSECustomer(`verifactu-${session.tenantId}`);
      seCustomer = await prisma.seCustomer.create({
        data: {
          id: created.customer_id, // v6: campo customer_id (era id en v5)
          tenantId: session.tenantId,
          identifier: created.identifier,
          // sin secret en v6
        },
      });
    }

    // 2. Crear connect session
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    const returnTo = `${origin}/api/isaak/banking/saltedge/callback`;

    const connectSession = await createConnectSession({
      customerId: seCustomer.id, // v6: customerId (era customerSecret en v5)
      returnTo,
      countryCode: 'ES',
      providerCode: body.providerCode,
      consent: {
        scopes: ['accounts', 'balance', 'transactions'], // v6: scopes renombrados
        from_date:
          body.fromDate ??
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });

    return NextResponse.json({
      connect_url: connectSession.connect_url,
      expires_at: connectSession.expires_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
