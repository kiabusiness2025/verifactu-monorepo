/**
 * GET  /api/isaak/banking/saltedge/transactions  → lee transacciones de BD
 * POST /api/isaak/banking/saltedge/transactions  → sincroniza desde Salt Edge
 *
 * Query params para GET:
 *   accountId  — filtrar por cuenta
 *   fromDate   — YYYY-MM-DD
 *   toDate     — YYYY-MM-DD
 *   pending    — 'true' para incluir pendientes
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';
import { listTransactions } from '@verifactu/integrations/saltedge';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId') ?? undefined;
  const fromDate = searchParams.get('fromDate') ?? undefined;
  const toDate = searchParams.get('toDate') ?? undefined;
  const includePending = searchParams.get('pending') === 'true';

  const transactions = await prisma.seTransaction.findMany({
    where: {
      tenantId: session.tenantId,
      ...(accountId ? { accountId } : {}),
      ...(fromDate ? { madeOn: { gte: fromDate } } : {}),
      ...(toDate ? { madeOn: { lte: toDate } } : {}),
      ...(includePending ? {} : { status: 'posted' }),
      duplicated: false,
    },
    orderBy: { madeOn: 'desc' },
    take: 200,
  });

  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    accountId?: string;
    fromDate?: string;
  };

  const seCustomer = await prisma.seCustomer.findUnique({
    where: { tenantId: session.tenantId },
  });

  if (!seCustomer) {
    return NextResponse.json({ error: 'No hay banco conectado.' }, { status: 404 });
  }

  // Determinar qué cuentas sincronizar
  const accounts = await prisma.seAccount.findMany({
    where: {
      tenantId: session.tenantId,
      status: 'active',
      ...(body.accountId ? { id: body.accountId } : {}),
    },
    include: { connection: { select: { id: true } } },
  });

  if (accounts.length === 0) {
    return NextResponse.json({ error: 'No hay cuentas activas.' }, { status: 404 });
  }

  let totalSynced = 0;

  for (const account of accounts) {
    let nextId: string | null = null;

    do {
      const { transactions, nextId: nxt } = await listTransactions({
        connectionId: account.connection.id,
        accountId: account.id,
        fromId: nextId ?? undefined,
        fromDate: body.fromDate,
      });

      for (const tx of transactions) {
        await prisma.seTransaction.upsert({
          where: { id: tx.id },
          create: {
            id: tx.id,
            tenantId: session.tenantId,
            accountId: account.id,
            status: tx.status,
            madeOn: tx.made_on,
            amount: tx.amount,
            currency: tx.currency_code,
            description: tx.description,
            category: tx.category,
            payee: tx.extra?.payee,
            payer: tx.extra?.payer,
            duplicated: tx.duplicated,
          },
          update: {
            status: tx.status,
            duplicated: tx.duplicated,
            payee: tx.extra?.payee,
            payer: tx.extra?.payer,
          },
        });
        totalSynced++;
      }

      nextId = nxt;
    } while (nextId);
  }

  // Auto-reconcile after sync (fire-and-forget, no errors block the response)
  void reconcileTenant(session.tenantId).catch((err) => console.error('[reconcile-auto]', err));

  return NextResponse.json({ synced: totalSynced });
}
