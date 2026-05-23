/**
 * GET /api/isaak/banking/eb/callback?code=XXX&state=YYY
 *
 * Step 2: Enable Banking redirects here after the user authorises at their bank.
 * - `code` is exchanged for a session via POST /sessions
 * - `state` maps back to the pending SeConnection (and verifies CSRF)
 * - Accounts are upserted and 90 days of transactions are synced
 */
import { prisma } from '@/app/lib/prisma';
import {
  createEbSession,
  getEbAccountDetails,
  getEbAccountBalances,
  getAllEbTransactions,
  resolveEbBalance,
  normalizeEbTransaction,
} from '@verifactu/integrations/enable-banking';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

function nDaysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const bankingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/banking`;

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`${bankingUrl}?eb_error=${error ?? 'missing_params'}`, request.url)
    );
  }

  // Find the pending connection created during POST /connect
  const pending = await prisma.seConnection.findUnique({
    where: { id: state },
    select: { id: true, tenantId: true, providerCode: true, countryCode: true },
  });

  if (!pending) {
    return NextResponse.redirect(
      new URL(`${bankingUrl}?eb_error=invalid_state`, request.url)
    );
  }

  try {
    const ebSession = await createEbSession(code);
    const sessionId = ebSession.session_id;
    const expiresAt = ebSession.access?.valid_until
      ? new Date(ebSession.access.valid_until)
      : null;

    // Build the real connection from session data
    const aspspName =
      ebSession.aspsp?.name ?? pending.providerCode;

    // Replace pending (state) connection with real (session_id) connection
    await prisma.$transaction(async (tx) => {
      await tx.seConnection.create({
        data: {
          id: sessionId,
          tenantId: pending.tenantId,
          seCustomerId: null,
          providerCode: aspspName,
          providerName: aspspName,
          countryCode: pending.countryCode,
          status: 'active',
          provider: 'enablebanking',
          lastSyncAt: new Date(),
          expiresAt,
        },
      });
      await tx.seConnection.delete({ where: { id: state } });
    });

    // Sync each account returned by the session
    for (const acct of ebSession.accounts) {
      try {
        const [details, balances] = await Promise.allSettled([
          getEbAccountDetails(acct.uid),
          getEbAccountBalances(acct.uid),
        ]);

        const iban =
          acct.account_id?.iban ??
          (details.status === 'fulfilled' ? (details.value.iban ?? null) : null);
        const name =
          acct.name ??
          (details.status === 'fulfilled'
            ? (details.value.name ?? details.value.owner_name ?? acct.uid)
            : acct.uid);
        const currency =
          acct.currency ??
          (details.status === 'fulfilled' ? (details.value.currency ?? 'EUR') : 'EUR');
        const balance =
          balances.status === 'fulfilled' ? resolveEbBalance(balances.value) : 0;

        await prisma.seAccount.upsert({
          where: { id: acct.uid },
          create: {
            id: acct.uid,
            tenantId: pending.tenantId,
            connectionId: sessionId,
            name,
            nature: 'account',
            balance,
            currency,
            iban,
            status: 'active',
          },
          update: { name, balance, currency, iban, status: 'active' },
        });

        // Fetch last 90 days of transactions
        const txs = await getAllEbTransactions(acct.uid, nDaysAgo(90)).catch(() => []);
        for (const tx of txs) {
          const normalized = normalizeEbTransaction(
            tx,
            acct.uid,
            pending.tenantId,
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
        }
      } catch (acctErr) {
        console.error('[eb-callback] account sync error', { uid: acct.uid, acctErr });
      }
    }

    void reconcileTenant(pending.tenantId).catch((err) =>
      console.error('[eb-callback] reconcile error', err)
    );

    return NextResponse.redirect(new URL(`${bankingUrl}?eb_callback=1`, request.url));
  } catch (err) {
    console.error('[eb-callback]', err);
    return NextResponse.redirect(
      new URL(`${bankingUrl}?eb_error=sync_failed`, request.url)
    );
  }
}
