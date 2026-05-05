/**
 * GET /api/isaak/banking/saltedge/callback
 *
 * Paso 2: Salt Edge redirige aquí tras la autorización bancaria.
 * Query params: connection_id, state (opcional)
 * Guarda la conexión y redirige al usuario a la sección de banca.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getConnection, listAccounts } from '@verifactu/integrations/saltedge';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connection_id');
  const error = searchParams.get('error');

  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/settings?section=banking`;

  if (error || !connectionId) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}&gc_error=${error ?? 'no_connection_id'}`, request.url)
    );
  }

  try {
    const seCustomer = await prisma.seCustomer.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!seCustomer) {
      return NextResponse.redirect(new URL(`${settingsUrl}&gc_error=no_customer`, request.url));
    }

    // Obtener datos de la conexión desde Salt Edge
    const conn = await getConnection(connectionId, seCustomer.secret);

    // Guardar conexión en BD (upsert por si ya existe)
    await prisma.seConnection.upsert({
      where: { id: connectionId },
      create: {
        id: connectionId,
        tenantId: session.tenantId,
        seCustomerId: seCustomer.id,
        providerCode: conn.provider_id,
        providerName: conn.provider_name,
        countryCode: conn.country_code,
        status: conn.status,
      },
      update: {
        status: conn.status,
        providerName: conn.provider_name,
      },
    });

    // Sincronizar cuentas inmediatamente
    if (conn.status === 'active') {
      const accounts = await listAccounts(connectionId, seCustomer.secret);
      for (const acc of accounts) {
        await prisma.seAccount.upsert({
          where: { id: acc.id },
          create: {
            id: acc.id,
            tenantId: session.tenantId,
            connectionId,
            name: acc.name,
            nature: acc.nature,
            balance: acc.balance,
            currency: acc.currency_code,
            iban: acc.extra?.iban,
            status: acc.status,
          },
          update: {
            name: acc.name,
            balance: acc.balance,
            status: acc.status,
            iban: acc.extra?.iban,
          },
        });
      }
    }

    return NextResponse.redirect(new URL(`${settingsUrl}&gc_callback=1`, request.url));
  } catch (err: unknown) {
    console.error('[saltedge-callback]', err);
    return NextResponse.redirect(new URL(`${settingsUrl}&gc_error=sync_failed`, request.url));
  }
}
