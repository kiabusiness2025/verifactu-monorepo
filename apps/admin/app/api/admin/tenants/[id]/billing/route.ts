import { requireAdminContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/tenants/[id]/billing
 *
 * Body (one of):
 *   { action: 'extend_trial', days: number }
 *   { action: 'change_plan', planId: number }
 *   { action: 'cancel' }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminContext(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const { id: tenantId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const action = body.action;

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Tenant no encontrado' }, { status: 404 });
  }

  // Find active/trial subscription
  const subscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ['active', 'trial', 'past_due'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    return NextResponse.json(
      { ok: false, error: 'El tenant no tiene suscripción activa' },
      { status: 404 }
    );
  }

  // ── Extend trial ──────────────────────────────────────────────────────────
  if (action === 'extend_trial') {
    const days = typeof body.days === 'number' ? Math.floor(body.days) : 7;
    if (days < 1 || days > 90) {
      return NextResponse.json(
        { ok: false, error: 'El número de días debe estar entre 1 y 90' },
        { status: 400 }
      );
    }

    const base =
      subscription.trialEndsAt && subscription.trialEndsAt > new Date()
        ? subscription.trialEndsAt
        : new Date();
    const newTrialEndsAt = new Date(base.getTime() + days * 86_400_000);

    const updated = await prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        trialEndsAt: newTrialEndsAt,
        status: 'trial',
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Trial extendido ${days} días hasta ${newTrialEndsAt.toISOString()}`,
      subscription: { id: updated.id, status: updated.status, trialEndsAt: updated.trialEndsAt },
    });
  }

  // ── Change plan ───────────────────────────────────────────────────────────
  if (action === 'change_plan') {
    const planId = typeof body.planId === 'number' ? body.planId : null;
    if (!planId) {
      return NextResponse.json({ ok: false, error: 'planId requerido' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ ok: false, error: 'Plan no encontrado' }, { status: 404 });
    }

    const updated = await prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: { planId },
    });

    return NextResponse.json({
      ok: true,
      message: `Plan cambiado a ${plan.name} (${plan.code})`,
      subscription: { id: updated.id, planId: updated.planId },
    });
  }

  // ── Cancel ────────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    const updated = await prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Suscripción marcada como cancelada',
      subscription: { id: updated.id, status: updated.status },
    });
  }

  return NextResponse.json({ ok: false, error: 'Acción no reconocida' }, { status: 400 });
}
