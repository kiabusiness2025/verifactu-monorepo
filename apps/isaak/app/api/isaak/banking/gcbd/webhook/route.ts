/**
 * POST /api/isaak/banking/gcbd/webhook
 *
 * Receives webhook events from GoCardless Bank Account Data.
 * Configure this URL in your GoCardless BAD dashboard.
 *
 * Handled events:
 * - ACCOUNT_TRANSACTION — new transactions available → sync + reconcile
 * - ACCOUNT_ERROR       — account has an error → mark inactive
 * - REQUISITION_EXPIRED — consent expired → mark connection disabled, alert
 */
import { prisma } from '@/app/lib/prisma';
import {
  verifyGcbdWebhook,
  getAccountBalances,
  getAccountTransactions,
  resolveBalance,
  normalizeTransaction,
} from '@verifactu/integrations/gocardless-bank-data';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';
import { createAlert } from '@/app/lib/isaak-alert-service';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

type GcbdWebhookPayload = {
  type: string;
  data: {
    account_id?: string;
    requisition_id?: string;
    status?: string;
  };
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-gcbd-signature') ?? '';
  const rawBody = await request.text();

  // SEC C2 (2026): la firma es OBLIGATORIA. Anteriormente la verificación
  // se saltaba si la cabecera no llegaba, permitiendo a un atacante
  // enviar payloads falsos y corromper conciliaciones bancarias.
  if (!signature) {
    return NextResponse.json(
      { error: 'Falta la cabecera x-gcbd-signature.' },
      { status: 401 },
    );
  }
  if (!verifyGcbdWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let payload: GcbdWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  try {
    await handleEvent(payload);
  } catch (err) {
    console.error('[gcbd-webhook]', err);
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(payload: GcbdWebhookPayload) {
  const { type, data } = payload;

  if (type === 'ACCOUNT_TRANSACTION' && data.account_id) {
    const account = await prisma.seAccount.findUnique({
      where: { id: data.account_id },
      select: { id: true, tenantId: true, connectionId: true },
    });
    if (!account) return;

    const conn = await prisma.seConnection.findUnique({
      where: { id: account.connectionId },
      select: { lastSyncAt: true },
    });

    const fromDate = conn?.lastSyncAt
      ? new Date(conn.lastSyncAt.getTime() - 86_400_000).toISOString().slice(0, 10)
      : new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

    const [balances, txData] = await Promise.allSettled([
      getAccountBalances(account.id),
      getAccountTransactions(account.id, fromDate),
    ]);

    if (balances.status === 'fulfilled') {
      await prisma.seAccount.update({
        where: { id: account.id },
        data: { balance: resolveBalance(balances.value) },
      });
    }

    if (txData.status === 'fulfilled') {
      for (const tx of txData.value.booked) {
        const normalized = normalizeTransaction(tx, account.id, account.tenantId, 'posted');
        await prisma.seTransaction.upsert({
          where: { id: normalized.id },
          create: normalized,
          update: { status: normalized.status, payee: normalized.payee, payer: normalized.payer },
        });
      }
    }

    await prisma.seConnection.update({
      where: { id: account.connectionId },
      data: { lastSyncAt: new Date() },
    });

    void reconcileTenant(account.tenantId).catch((err) =>
      console.error('[gcbd-webhook] reconcile error', err)
    );
    return;
  }

  if (type === 'ACCOUNT_ERROR' && data.account_id) {
    await prisma.seAccount.updateMany({
      where: { id: data.account_id },
      data: { status: 'inactive' },
    });
    return;
  }

  if (type === 'REQUISITION_EXPIRED' && data.requisition_id) {
    const conn = await prisma.seConnection.findUnique({
      where: { id: data.requisition_id },
      select: { id: true, tenantId: true, providerName: true },
    });
    if (!conn) return;

    await prisma.seConnection.update({
      where: { id: conn.id },
      data: { status: 'disabled' },
    });

    await createAlert({
      tenantId: conn.tenantId,
      type: `gcbd_consent_expired_${conn.id}`,
      title: `Banca: consentimiento expirado (${conn.providerName})`,
      body: `El acceso a tus cuentas bancarias de ${conn.providerName} ha expirado. Reconecta tu banco para que Isaak vuelva a tener datos actualizados.`,
      channel: 'email',
      metadata: { connectionId: conn.id, provider: 'gcbd' },
    });
    return;
  }
}
