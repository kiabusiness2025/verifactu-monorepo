/**
 * GET  /api/isaak/banking/saltedge/accounts   → lista cuentas del tenant
 * POST /api/isaak/banking/saltedge/accounts   → sincroniza cuentas desde Salt Edge
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { listAccounts } from '@verifactu/integrations/saltedge';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const accounts = await prisma.seAccount.findMany({
    where: { tenantId: session.tenantId, status: 'active' },
    include: { connection: { select: { providerName: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ accounts });
}

export async function POST(_request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const seCustomer = await prisma.seCustomer.findUnique({
    where: { tenantId: session.tenantId },
    include: { connections: { where: { status: 'active' } } },
  });

  if (!seCustomer) {
    return NextResponse.json({ error: 'No hay banco conectado.' }, { status: 404 });
  }

  let synced = 0;
  for (const conn of seCustomer.connections) {
    try {
      const accounts = await listAccounts(conn.id); // v6: sin customerSecret
      for (const acc of accounts) {
        await prisma.seAccount.upsert({
          where: { id: acc.id },
          create: {
            id: acc.id,
            tenantId: session.tenantId,
            connectionId: conn.id,
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
        synced++;
      }
      await prisma.seConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (err) {
      console.error(`[saltedge-accounts] sync error for connection ${conn.id}:`, err);
    }
  }

  return NextResponse.json({ synced });
}
