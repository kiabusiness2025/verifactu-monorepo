/**
 * POST /api/isaak/banking/saltedge/webhook
 *
 * Recibe notificaciones de Salt Edge:
 * - connection.success  → activar conexión + sincronizar cuentas
 * - connection.error    → marcar conexión como error
 * - connection.disconnected → marcar como inactiva
 * - data.updated        → nueva sincronización disponible (enqueue)
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifySaltEdgeWebhook, listAccounts } from '@verifactu/integrations/saltedge';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

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

    // Sincronizar cuentas
    const accounts = await listAccounts(connectionId); // v6: sin customerSecret
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
