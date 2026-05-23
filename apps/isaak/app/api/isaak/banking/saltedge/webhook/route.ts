/**
 * POST /api/isaak/banking/saltedge/webhook
 *
 * Recibe notificaciones de Salt Edge:
 * - connection.success  → activar conexión + sincronizar cuentas + transacciones
 * - connection.error    → marcar conexión como error
 * - connection.disconnected → marcar como inactiva
 * - data.updated        → sincronizar transacciones nuevas + reconciliar
 */
import { prisma } from '@/app/lib/prisma';
import { listAccounts, listTransactions, verifySaltEdgeWebhook } from '@verifactu/integrations/saltedge';
import { reconcileTenant } from '@/app/lib/bank-reconciliation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const signature = request.headers.get('Signature') ?? '';
  const rawBody = await request.text();

  // v6: verificación RSA-SHA256 con clave pública de Salt Edge
  // El string firmado es: "callback_url|post_body"
  if (signature) {
    const callbackUrl =
      process.env.SALTEDGE_CALLBACK_URL ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/isaak/banking/saltedge/webhook`;
    if (!verifySaltEdgeWebhook(callbackUrl, rawBody, signature)) {
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }
  }

  let payload: SEWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  try {
    await handleWebhook(payload);
  } catch (err) {
    console.error('[saltedge-webhook] Error:', err);
  }

  return NextResponse.json({ received: true });
}

// ──────────────────────────────────────────────────────────────────────────────

type SEWebhookPayload = {
  meta: { version: string; time: string };
  data: {
    connection_id?: string;
    customer_id?: string;
    type?: string;
    stage?: string;
  };
};

async function handleWebhook(payload: SEWebhookPayload) {
  const { data } = payload;
  const connectionId = data.connection_id;
  if (!connectionId) return;

  const connection = await prisma.seConnection.findUnique({
    where: { id: connectionId },
    include: { customer: true },
  });
  if (!connection) return;

  const type = data.type;

  if (type === 'connection.success' || data.stage === 'finish') {
    await prisma.seConnection.update({
      where: { id: connectionId },
      data: { status: 'active', lastSyncAt: new Date() },
    });

    // Sync accounts
    const accounts = await listAccounts(connectionId);
    for (const acc of accounts) {
      await prisma.seAccount.upsert({
        where: { id: acc.id },
        create: {
          id: acc.id,
          tenantId: connection.tenantId,
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

    // Sync last 90 days of transactions on first connect
    await syncConnectionTransactions(connectionId, connection.tenantId, nDaysAgo(90));
    void reconcileTenant(connection.tenantId).catch((err) =>
      console.error('[saltedge-webhook] reconcile error', err)
    );
    return;
  }

  if (type === 'data.updated') {
    // Sync incremental transactions since last sync (or last 30 days as fallback)
    const fromDate = connection.lastSyncAt
      ? toIsoDate(new Date(connection.lastSyncAt.getTime() - 86_400_000)) // 1 day overlap
      : nDaysAgo(30);

    await syncConnectionTransactions(connectionId, connection.tenantId, fromDate);

    await prisma.seConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    void reconcileTenant(connection.tenantId).catch((err) =>
      console.error('[saltedge-webhook] reconcile error', err)
    );
    return;
  }

  if (type === 'connection.error') {
    await prisma.seConnection.update({
      where: { id: connectionId },
      data: { status: 'inactive' },
    });
    return;
  }

  if (type === 'connection.disconnected') {
    await prisma.seConnection.update({
      where: { id: connectionId },
      data: { status: 'disabled' },
    });
    return;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function nDaysAgo(n: number) {
  return toIsoDate(new Date(Date.now() - n * 86_400_000));
}

async function syncConnectionTransactions(
  connectionId: string,
  tenantId: string,
  fromDate: string
): Promise<number> {
  const accounts = await prisma.seAccount.findMany({
    where: { connectionId, tenantId, status: 'active' },
    select: { id: true },
  });

  let total = 0;

  for (const account of accounts) {
    let nextId: string | null = null;
    do {
      const { transactions, nextId: nxt } = await listTransactions({
        connectionId,
        accountId: account.id,
        fromId: nextId ?? undefined,
        fromDate,
      });

      for (const tx of transactions) {
        await prisma.seTransaction.upsert({
          where: { id: tx.id },
          create: {
            id: tx.id,
            tenantId,
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
        total++;
      }

      nextId = nxt;
    } while (nextId);
  }

  return total;
}
