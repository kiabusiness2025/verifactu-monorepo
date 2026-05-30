// V1.8.3 — CRUD de webhook endpoints del tenant.
//
// GET  → lista endpoints + counts de deliveries por status.
// POST → crea un endpoint con url, eventos suscritos y secret generado.
// (DELETE en /[id]/route.ts).

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { ISAAK_WEBHOOK_EVENTS, isValidWebhookEventType } from '@/app/lib/isaak-webhook-emitter';

export const runtime = 'nodejs';

const MAX_ENDPOINTS_PER_TENANT = 10;
const SECRET_BYTES = 24;

function generateSecret(): string {
  return `whsec_${randomBytes(SECRET_BYTES).toString('hex')}`;
}

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.protocol === 'http:' && !u.hostname.match(/^(localhost|127\.0\.0\.1)$/)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const endpoints = await prisma.isaakWebhookEndpoint.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      secret: true,
    },
  });

  // Counts por endpoint (paralelo)
  const counts = await Promise.all(
    endpoints.map(async (e) => {
      const [delivered, failed, pending] = await Promise.all([
        prisma.isaakWebhookDelivery.count({
          where: { endpointId: e.id, status: 'delivered' },
        }),
        prisma.isaakWebhookDelivery.count({
          where: { endpointId: e.id, status: { in: ['failed', 'dead'] } },
        }),
        prisma.isaakWebhookDelivery.count({
          where: { endpointId: e.id, status: 'pending' },
        }),
      ]);
      return { id: e.id, delivered, failed, pending };
    }),
  );
  const countsMap = new Map(counts.map((c) => [c.id, c]));

  return NextResponse.json({
    availableEvents: ISAAK_WEBHOOK_EVENTS,
    endpoints: endpoints.map((e) => {
      const c = countsMap.get(e.id) ?? { delivered: 0, failed: 0, pending: 0 };
      return {
        id: e.id,
        url: e.url,
        events: e.events,
        active: e.active,
        createdAt: e.createdAt.toISOString(),
        // Secret se devuelve enmascarado salvo en POST (justo tras crear).
        secretMasked: `${e.secret.slice(0, 11)}…${e.secret.slice(-4)}`,
        stats: c,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { url?: unknown; events?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!isHttpsUrl(url)) {
    return NextResponse.json(
      { error: 'invalid_url', message: 'La URL debe empezar por https:// (o http://localhost para test).' },
      { status: 400 },
    );
  }

  const eventsRaw = Array.isArray(body.events) ? body.events : [];
  const events = eventsRaw
    .filter((e): e is string => typeof e === 'string')
    .filter((e) => isValidWebhookEventType(e));
  if (events.length === 0) {
    return NextResponse.json(
      {
        error: 'invalid_events',
        message: `Suscribe al menos un evento válido. Disponibles: ${ISAAK_WEBHOOK_EVENTS.join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const existingCount = await prisma.isaakWebhookEndpoint.count({
    where: { tenantId: session.tenantId },
  });
  if (existingCount >= MAX_ENDPOINTS_PER_TENANT) {
    return NextResponse.json(
      {
        error: 'too_many_endpoints',
        message: `Máx ${MAX_ENDPOINTS_PER_TENANT} endpoints por tenant. Borra alguno antes de crear más.`,
      },
      { status: 409 },
    );
  }

  const secret = generateSecret();
  const created = await prisma.isaakWebhookEndpoint.create({
    data: {
      tenantId: session.tenantId,
      url,
      events,
      secret,
      active: true,
    },
    select: { id: true, url: true, events: true, active: true, createdAt: true },
  });

  // El secret se devuelve UNA sola vez aquí — después solo lo verás enmascarado.
  return NextResponse.json({
    ok: true,
    endpoint: {
      ...created,
      createdAt: created.createdAt.toISOString(),
      secret,
      secretShownOnce:
        'Guarda este secret ahora. Lo necesitas para verificar la firma HMAC X-Isaak-Signature. No volverá a aparecer.',
    },
  });
}
