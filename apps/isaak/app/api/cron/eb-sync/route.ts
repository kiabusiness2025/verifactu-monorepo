/**
 * GET /api/cron/eb-sync
 *
 * Runs every 6 hours (00:00 / 06:00 / 12:00 / 18:00 UTC).
 * PSD2 AIS allows approximately 4 background fetches per account per day.
 *
 * For every active Enable Banking connection across all tenants:
 * 1. Fetches up-to-date account balances.
 * 2. Fetches new transactions since the last sync (or 30 days back on first run).
 * 3. Upserts to SeAccount / SeTransaction and bumps lastSyncAt.
 *
 * Auth: CRON_SECRET header (set by Vercel).
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  getEbAccountBalances,
  getAllEbTransactions,
  resolveEbBalance,
  normalizeEbTransaction,
} from '@verifactu/integrations/enable-banking';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — iterate over all tenants

// ──────────────────────────────────────────────────────────────────────────────
// Auth helper (same pattern as other crons)
// ──────────────────────────────────────────────────────────────────────────────

function validateCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all active EB connections across all tenants
  const connections = await prisma.seConnection.findMany({
    where: { provider: 'enablebanking', status: 'active' },
    select: { id: true, tenantId: true, lastSyncAt: true },
  });

  const summary = {
    connections: connections.length,
    accountsUpdated: 0,
    transactionsSynced: 0,
    errors: 0,
    reconciledTenants: 0,
  };

  if (connections.length === 0) {
    return NextResponse.json({ ok: true, ...summary });
  }

  // Track which tenants need reconciliation after sync
  const tenantsToReconcile = new Set<string>();

  for (const conn of connections) {
    const accounts = await prisma.seAccount.findMany({
      where: { connectionId: conn.id, status: 'active' },
      select: { id: true },
    });

    // Determine fromDate: 1 day before last sync to avoid gaps; 30 days on first run
    const fromDate = conn.lastSyncAt
      ? new Date(conn.lastSyncAt.getTime() - 86_400_000).toISOString().slice(0, 10)
      : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

    for (const account of accounts) {
      try {
        const [balancesResult, txsResult] = await Promise.allSettled([
          getEbAccountBalances(account.id),
          getAllEbTransactions(account.id, fromDate),
        ]);

        if (balancesResult.status === 'fulfilled') {
          const balance = resolveEbBalance(balancesResult.value);
          const currency =
            balancesResult.value.length > 0
              ? balancesResult.value[0].balance_amount.currency
              : 'EUR';
          await prisma.seAccount.update({
            where: { id: account.id },
            data: { balance, currency },
          });
          summary.accountsUpdated++;
        } else {
          console.error('[eb-sync-cron] balance error', {
            accountId: account.id,
            connectionId: conn.id,
            err: balancesResult.reason,
          });
          summary.errors++;
        }

        if (txsResult.status === 'fulfilled') {
          for (const tx of txsResult.value) {
            const normalized = normalizeEbTransaction(
              tx,
              account.id,
              conn.tenantId,
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
            summary.transactionsSynced++;
          }
          tenantsToReconcile.add(conn.tenantId);
        } else {
          console.error('[eb-sync-cron] transactions error', {
            accountId: account.id,
            connectionId: conn.id,
            err: txsResult.reason,
          });
          summary.errors++;
        }
      } catch (err) {
        console.error('[eb-sync-cron] unexpected error', {
          accountId: account.id,
          connectionId: conn.id,
          err,
        });
        summary.errors++;
      }
    }

    // Bump lastSyncAt regardless of individual account errors
    await prisma.seConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date() },
    });
  }

  // Reconcile all affected tenants in parallel (fire-and-forget errors)
  await Promise.allSettled(
    [...tenantsToReconcile].map((tenantId) =>
      reconcileTenant(tenantId).catch((err) =>
        console.error('[eb-sync-cron] reconcile error', { tenantId, err })
      )
    )
  );
  summary.reconciledTenants = tenantsToReconcile.size;

  console.log('[eb-sync-cron] done', summary);
  return NextResponse.json({ ok: true, ...summary });
}
