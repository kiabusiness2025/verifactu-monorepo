/**
 * GET /api/isaak/banking/gcbd/callback?ref={requisition_id}
 *
 * Step 2: GoCardless BAD redirects here after the user authorises at their bank.
 * The `ref` param is the requisition ID. We fetch the requisition to get
 * the linked account IDs, then sync balances and initial transactions.
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  getRequisition,
  getAccountMeta,
  getAccountDetails,
  getAccountBalances,
  getAccountTransactions,
  resolveBalance,
  normalizeTransaction,
} from '@verifactu/integrations/gocardless-bank-data';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function nDaysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const requisitionId = searchParams.get('ref') ?? searchParams.get('requisition_id');
  const error = searchParams.get('error');

  const bankingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/banking`;

  if (error || !requisitionId) {
    return NextResponse.redirect(new URL(`${bankingUrl}?gc_error=${error ?? 'no_ref'}`, request.url));
  }

  try {
    const requisition = await getRequisition(requisitionId);

    if (requisition.status !== 'LN') {
      // Not linked yet or error
      const status = requisition.status;
      await prisma.seConnection.updateMany({
        where: { id: requisitionId, tenantId: session.tenantId },
        data: { status: status === 'EX' ? 'disabled' : 'inactive' },
      });
      return NextResponse.redirect(
        new URL(`${bankingUrl}?gc_error=not_linked&status=${status}`, request.url)
      );
    }

    // Mark connection as active and get institution name
    await prisma.seConnection.updateMany({
      where: { id: requisitionId, tenantId: session.tenantId },
      data: {
        status: 'active',
        providerCode: requisition.institution_id,
        providerName: requisition.institution_id,
        lastSyncAt: new Date(),
      },
    });

    // Sync each account
    for (const accountId of requisition.accounts) {
      try {
        const [meta, details, balances] = await Promise.allSettled([
          getAccountMeta(accountId),
          getAccountDetails(accountId),
          getAccountBalances(accountId),
        ]);

        const iban =
          details.status === 'fulfilled' ? (details.value.iban ?? null) : null;
        const name =
          details.status === 'fulfilled'
            ? (details.value.name ?? details.value.ownerName ?? accountId)
            : accountId;
        const balance =
          balances.status === 'fulfilled' ? resolveBalance(balances.value) : 0;
        const currency =
          balances.status === 'fulfilled' && balances.value.length > 0
            ? balances.value[0].balanceAmount.currency
            : 'EUR';
        const accountStatus =
          meta.status === 'fulfilled' ? meta.value.status : 'READY';

        await prisma.seAccount.upsert({
          where: { id: accountId },
          create: {
            id: accountId,
            tenantId: session.tenantId,
            connectionId: requisitionId,
            name,
            nature: 'account',
            balance,
            currency,
            iban,
            status: accountStatus === 'READY' ? 'active' : 'inactive',
          },
          update: { name, balance, iban, status: accountStatus === 'READY' ? 'active' : 'inactive' },
        });

        // Fetch last 90 days of transactions
        const txData = await getAccountTransactions(accountId, nDaysAgo(90)).catch(() => ({
          booked: [],
          pending: [],
        }));

        for (const tx of txData.booked) {
          const normalized = normalizeTransaction(tx, accountId, session.tenantId, 'posted');
          await prisma.seTransaction.upsert({
            where: { id: normalized.id },
            create: normalized,
            update: { status: normalized.status, payee: normalized.payee, payer: normalized.payer },
          });
        }
      } catch (accErr) {
        console.error('[gcbd-callback] account sync error', { accountId, accErr });
      }
    }

    // Run reconciliation in background
    void reconcileTenant(session.tenantId).catch((err) =>
      console.error('[gcbd-callback] reconcile error', err)
    );

    return NextResponse.redirect(new URL(`${bankingUrl}?gc_callback=1`, request.url));
  } catch (err) {
    console.error('[gcbd-callback]', err);
    return NextResponse.redirect(new URL(`${bankingUrl}?gc_error=sync_failed`, request.url));
  }
}
