/**
 * POST /api/isaak/banking/eb/sync
 *
 * Manually triggers a balance and transaction sync for all active Enable Banking
 * sessions of the authenticated tenant.
 *
 * Optional body: { fromDate?: string (YYYY-MM-DD) }
 * Returns: { synced: number; accountsUpdated: number }
 *
 * Note: Enable Banking does not push webhooks for AIS; use this route or the
 * connector-health cron to keep data fresh (PSD2 allows ~4 background fetches/day).
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  getEbAccountBalances,
  getAllEbTransactions,
  resolveEbBalance,
  normalizeEbTransaction,
} from '@verifactu/integrations/enable-banking';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { fromDate?: string };

  const connections = await prisma.seConnection.findMany({
    where: { tenantId: session.tenantId, provider: 'enablebanking', status: 'active' },
    select: { id: true, lastSyncAt: true },
  });

  if (connections.length === 0) {
    return NextResponse.json(
      { error: 'No hay cuentas Enable Banking activas.' },
      { status: 404 }
    );
  }

  let totalSynced = 0;
  let accountsUpdated = 0;

  for (const conn of connections) {
    const accounts = await prisma.seAccount.findMany({
      where: { connectionId: conn.id, status: 'active' },
      select: { id: true },
    });

    const fromDate =
      body.fromDate ??
      (conn.lastSyncAt
        ? new Date(conn.lastSyncAt.getTime() - 86_400_000).toISOString().slice(0, 10)
        : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));

    for (const account of accounts) {
      try {
        const [balances, txs] = await Promise.allSettled([
          getEbAccountBalances(account.id),
          getAllEbTransactions(account.id, fromDate),
        ]);

        if (balances.status === 'fulfilled') {
          const balance = resolveEbBalance(balances.value);
          const currency =
            balances.value.length > 0
              ? balances.value[0].balance_amount.currency
              : 'EUR';
          await prisma.seAccount.update({
            where: { id: account.id },
            data: { balance, currency },
          });
          accountsUpdated++;
        }

        if (txs.status === 'fulfilled') {
          for (const tx of txs.value) {
            const normalized = normalizeEbTransaction(
              tx,
              account.id,
              session.tenantId,
              'posted'
            );
            await prisma.seTransaction.upsert({
              where: { id: normalized.id },
              create: normalized,
              update: {
                status: normalized.status,
                payee: normalized.payee,
                payer: normalized.payer,
              },
            });
            totalSynced++;
          }
        }
      } catch (err) {
        console.error('[eb-sync] account error', { accountId: account.id, err });
      }
    }

    await prisma.seConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date() },
    });
  }

  void reconcileTenant(session.tenantId).catch((err) =>
    console.error('[eb-sync] reconcile error', err)
  );

  return NextResponse.json({ synced: totalSynced, accountsUpdated });
}
