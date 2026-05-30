// V1.8.2 — Gestor de códigos promocionales de Stripe (admin only).
//
// GET  → lista los últimos 50 promotion codes activos del account.
// POST → crea un coupon nuevo y un promotion code asociado en un solo
//        paso. Devuelve el código + URL share lista para pegar.
//
// Acceso: solo emails en ADMIN_EMAILS / HOLDED_ADMIN_EMAILS env vars.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { stripeClient } from '@verifactu/integrations';

export const runtime = 'nodejs';

function getAdminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS ?? process.env.HOLDED_ADMIN_EMAILS ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function isAdminSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user?.email) return null;
  const admins = getAdminEmails();
  if (admins.length === 0) return null;
  if (!admins.includes(user.email.toLowerCase())) return null;
  return { userId: session.userId, email: user.email };
}

const ISAAK_PUBLIC = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.chat';

const PROMO_CODE_RE = /^[A-Z0-9_-]{4,20}$/;

export async function GET() {
  const admin = await isAdminSession();
  if (!admin) return NextResponse.json({ error: 'admin_required' }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ codes: [], stripeConfigured: false });
  }

  try {
    const promos = await stripeClient.promotionCodes.list({
      active: true,
      limit: 50,
      expand: ['data.coupon'],
    });
    return NextResponse.json({
      stripeConfigured: true,
      codes: promos.data.map((p) => {
        const coupon = p.coupon;
        return {
          id: p.id,
          code: p.code,
          active: p.active,
          timesRedeemed: p.times_redeemed,
          maxRedemptions: p.max_redemptions,
          expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
          createdAt: new Date(p.created * 1000).toISOString(),
          discountPct: coupon?.percent_off ?? null,
          discountAmount: coupon?.amount_off ?? null,
          duration: coupon?.duration ?? null,
          durationMonths: coupon?.duration_in_months ?? null,
          shareUrl: `${ISAAK_PUBLIC}/signup?plan=pro&promo=${encodeURIComponent(p.code)}`,
        };
      }),
    });
  } catch (err) {
    console.error('[admin/promo-codes] list failed', err);
    return NextResponse.json(
      { error: 'list_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await isAdminSession();
  if (!admin) return NextResponse.json({ error: 'admin_required' }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  let body: {
    code?: string;
    percentOff?: number;
    duration?: 'once' | 'repeating' | 'forever';
    durationMonths?: number;
    maxRedemptions?: number;
    expiresInDays?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const code = (body.code ?? '').trim().toUpperCase();
  if (!PROMO_CODE_RE.test(code)) {
    return NextResponse.json(
      {
        error: 'invalid_code',
        message: 'El código debe tener 4-20 caracteres: letras, números, guiones o guiones bajos.',
      },
      { status: 400 },
    );
  }

  const percentOff = Number(body.percentOff);
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    return NextResponse.json(
      { error: 'invalid_percent', message: '`percentOff` debe estar entre 1 y 100.' },
      { status: 400 },
    );
  }

  const duration = body.duration ?? 'once';
  if (!['once', 'repeating', 'forever'].includes(duration)) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
  }

  const durationMonths =
    duration === 'repeating' && Number.isFinite(Number(body.durationMonths))
      ? Math.max(1, Math.min(36, Number(body.durationMonths)))
      : undefined;

  if (duration === 'repeating' && !durationMonths) {
    return NextResponse.json(
      { error: 'missing_duration_months', message: 'Indica `durationMonths` cuando duration es repeating.' },
      { status: 400 },
    );
  }

  const maxRedemptions =
    body.maxRedemptions && Number.isFinite(Number(body.maxRedemptions))
      ? Math.max(1, Math.min(10_000, Number(body.maxRedemptions)))
      : undefined;

  const expiresAt =
    body.expiresInDays && Number.isFinite(Number(body.expiresInDays))
      ? Math.floor(Date.now() / 1000) + Math.max(1, Math.min(365, Number(body.expiresInDays))) * 86_400
      : undefined;

  try {
    const coupon = await stripeClient.coupons.create({
      percent_off: percentOff,
      duration,
      ...(durationMonths ? { duration_in_months: durationMonths } : {}),
      name: `Isaak — ${percentOff}% ${duration === 'once' ? 'una vez' : duration === 'repeating' ? `${durationMonths}m` : 'siempre'}`,
    });

    const promo = await stripeClient.promotionCodes.create({
      coupon: coupon.id,
      code,
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    });

    return NextResponse.json({
      ok: true,
      id: promo.id,
      code: promo.code,
      shareUrl: `${ISAAK_PUBLIC}/signup?plan=pro&promo=${encodeURIComponent(promo.code)}`,
      percentOff,
      duration,
      durationMonths,
      maxRedemptions,
      expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
    });
  } catch (err) {
    console.error('[admin/promo-codes] create failed', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'create_failed', message },
      { status: 500 },
    );
  }
}
