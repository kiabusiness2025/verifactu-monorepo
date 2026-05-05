/**
 * POST /api/isaak/banking/webhook
 *
 * Receptor de eventos de GoCardless (mandatos, pagos, etc.).
 * Verifica la firma HMAC-SHA256 antes de procesar.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@verifactu/integrations/gocardless-payments';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

// Disable Next.js body parsing — needed for raw body signature check
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.ISAAK_GOCARDLESS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[gc-webhook] ISAAK_GOCARDLESS_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 500 });
  }

  const signature = request.headers.get('Webhook-Signature') ?? '';
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let payload: { events?: GCWebhookEvent[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const events = payload.events ?? [];

  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error('[gc-webhook] Error handling event', event.id, err);
    }
  }

  return NextResponse.json({ received: events.length });
}

// ──────────────────────────────────────────────────────────────────────────────

type GCWebhookEvent = {
  id: string;
  resource_type: string;
  action: string;
  links: Record<string, string>;
  details: { origin: string; cause: string; description: string };
};

async function handleEvent(event: GCWebhookEvent) {
  const { resource_type, action, links } = event;

  if (resource_type === 'mandates') {
    const mandateId = links.mandate;
    if (!mandateId) return;

    const statusMap: Record<string, string> = {
      submitted: 'submitted',
      active: 'active',
      failed: 'failed',
      cancelled: 'cancelled',
      expired: 'expired',
      reinstated: 'active',
    };
    const newStatus = statusMap[action];
    if (newStatus) {
      await prisma.gcMandate.updateMany({
        where: { id: mandateId },
        data: { status: newStatus },
      });
    }
    return;
  }

  if (resource_type === 'payments') {
    const paymentId = links.payment;
    if (!paymentId) return;

    const paymentStatusMap: Record<string, string> = {
      submitted: 'submitted',
      confirmed: 'confirmed',
      paid_out: 'paid_out',
      failed: 'failed',
      cancelled: 'cancelled',
      customer_approval_denied: 'customer_approval_denied',
      charged_back: 'charged_back',
    };
    const newStatus = paymentStatusMap[action];
    if (newStatus) {
      await prisma.gcPayment.updateMany({
        where: { id: paymentId },
        data: { status: newStatus },
      });
    }
    return;
  }
}
