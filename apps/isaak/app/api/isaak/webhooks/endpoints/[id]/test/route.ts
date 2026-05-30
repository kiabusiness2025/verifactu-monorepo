// V1.9.1 — Test de un webhook endpoint del tenant.
//
// POST /api/isaak/webhooks/endpoints/[id]/test
// body opcional: { event?: string }
//
// Envía un payload sintético al endpoint y devuelve statusCode +
// durationMs. No persiste en IsaakWebhookDelivery (es prueba).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  ISAAK_WEBHOOK_EVENTS,
  isValidWebhookEventType,
  testDeliverWebhook,
} from '@/app/lib/isaak-webhook-emitter';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

// Payloads sintéticos por tipo de evento (data realistic para que el
// receptor pueda validar su parseador).
const SAMPLE_DATA: Record<string, unknown> = {
  'invoice.created': {
    invoiceId: 'inv_test_123',
    documentNumber: 'F-2026-0042',
    counterpartyName: 'Cliente de prueba',
    counterpartyNif: 'B12345678',
    total: 1210.0,
    base: 1000.0,
    iva: 210.0,
    issuedAt: new Date().toISOString(),
  },
  'invoice.updated': {
    invoiceId: 'inv_test_123',
    changedFields: ['total', 'status'],
    updatedAt: new Date().toISOString(),
  },
  'invoice.sent': {
    invoiceId: 'inv_test_123',
    recipients: ['cliente@example.com'],
    sentAt: new Date().toISOString(),
  },
  'payment.registered': {
    paymentId: 'pay_test_456',
    invoiceId: 'inv_test_123',
    amount: 1210.0,
    method: 'transfer',
    paidAt: new Date().toISOString(),
  },
  'verifactu.submitted': {
    invoiceId: 'inv_test_123',
    submissionId: 'verifactu_test_789',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  },
  'verifactu.registered': {
    invoiceId: 'inv_test_123',
    submissionId: 'verifactu_test_789',
    csv: 'TEST1234567890',
    registeredAt: new Date().toISOString(),
  },
  'tax_return.drafted': {
    modelo: '303',
    periodo: '2026T1',
    importe: 1234.56,
    draftedAt: new Date().toISOString(),
  },
  'tax_return.submitted': {
    modelo: '303',
    periodo: '2026T1',
    importe: 1234.56,
    nrc: 'TEST-NRC-XYZ',
    submittedAt: new Date().toISOString(),
  },
  'chat.completed': {
    conversationId: 'conv_test_abc',
    messageCount: 3,
    completedAt: new Date().toISOString(),
  },
};

export async function POST(req: NextRequest, ctx: Context) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  let body: { event?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* body opcional */
  }

  const endpoint = await prisma.isaakWebhookEndpoint.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, url: true, secret: true, events: true },
  });
  if (!endpoint) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Elegimos el evento: el del body si es válido y está suscrito, sino
  // el primero de los suscritos, sino 'chat.completed' como genérico.
  let event = 'chat.completed';
  if (typeof body.event === 'string' && isValidWebhookEventType(body.event)) {
    if (endpoint.events.length === 0 || endpoint.events.includes(body.event)) {
      event = body.event;
    }
  } else if (endpoint.events.length > 0) {
    const first = endpoint.events[0];
    if ((ISAAK_WEBHOOK_EVENTS as readonly string[]).includes(first)) event = first;
  }

  const data = SAMPLE_DATA[event] ?? { note: 'Test payload sin sample específico para este evento.' };

  const result = await testDeliverWebhook(endpoint.url, endpoint.secret, event, data);

  return NextResponse.json({
    ok: result.ok,
    event,
    statusCode: result.statusCode ?? null,
    durationMs: result.durationMs,
    error: result.error ?? null,
  });
}
