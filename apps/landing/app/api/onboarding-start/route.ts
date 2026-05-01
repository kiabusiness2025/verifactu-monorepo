import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@verifactu/db';
import { verifySessionToken, readSessionSecret, SESSION_COOKIE_NAME } from '@verifactu/utils';
import { getAppUrl } from '../../lib/urls';

/**
 * POST /api/onboarding-start
 *
 * Creates a draft Order for the requested plan/service and redirects
 * the user to app.verifactu.business/onboarding to continue setup.
 *
 * Body:
 *   - planId: subscription plan id (basico | pyme | empresa | pro)
 *   - email?: pre-fill email
 *
 * Returns:
 *   - { redirectUrl: string, orderId: string }
 *
 * If the user already has a session, the order is linked to their uid.
 */

const schema = z.object({
  planId: z.enum(['basico', 'pyme', 'empresa', 'pro']),
  email: z.string().email().optional(),
  name: z.string().max(120).optional(),
});

async function getUserFromSession(req: NextRequest) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    return payload ? { uid: payload.uid || '', email: payload.email || null } : null;
  } catch {
    return null;
  }
}

// Map plan ids to catalog item slugs so the order line can reference the catalog
const PLAN_SLUG_MAP: Record<string, string> = {
  basico: 'suscripcion-basico',
  pyme: 'suscripcion-pyme',
  empresa: 'suscripcion-empresa',
  pro: 'suscripcion-pro',
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { planId, email, name } = parsed.data;
  const sessionUser = await getUserFromSession(req);

  try {
    // Try to find the catalog item for this plan to attach as an order line.
    // If the catalog is not yet seeded, we still create the draft order without a line.
    const catalogSlug = PLAN_SLUG_MAP[planId];
    const catalogItem = await prisma.catalogItem
      .findUnique({
        where: { slug: catalogSlug },
        include: { prices: { where: { isDefault: true, isActive: true }, take: 1 } },
      })
      .catch(() => null);

    const defaultPrice = catalogItem?.prices[0] ?? null;
    const unitAmount = defaultPrice?.unitAmount ?? null;

    const order = await prisma.order.create({
      data: {
        status: 'draft',
        sourceChannel: 'landing',
        buyerEmail: email ?? sessionUser?.email ?? null,
        buyerName: name ?? null,
        userId: sessionUser?.uid ?? null,
        subtotalAmount: unitAmount ?? 0,
        taxAmount: 0,
        totalAmount: unitAmount ?? 0,
        metadataJson: { planId, onboardingStart: true },
        ...(catalogItem && defaultPrice
          ? {
              lines: {
                create: {
                  catalogItemId: catalogItem.id,
                  catalogPriceId: defaultPrice.id,
                  quantity: 1,
                  unitAmount: unitAmount!,
                  taxAmount: 0,
                  totalAmount: unitAmount!,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    const appUrl = getAppUrl();
    const params = new URLSearchParams({ orderId: order.id, plan: planId });
    if (email) params.set('email', email);
    const redirectUrl = `${appUrl}/onboarding?${params.toString()}`;

    return NextResponse.json({ redirectUrl, orderId: order.id });
  } catch (err) {
    console.error('[api/onboarding-start] error:', err);
    return NextResponse.json({ error: 'Error al iniciar el proceso' }, { status: 500 });
  }
}
