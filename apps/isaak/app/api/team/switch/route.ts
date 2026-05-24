/**
 * POST /api/team/switch — switch the active workspace
 *
 * Body: { tenantId: string }
 * Updates UserPreference.preferredTenantId after verifying the user has an
 * active membership in the target tenant.
 */

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getHoldedSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId : null;
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId requerido.' }, { status: 400 });
  }

  // Verify user has active membership in target tenant
  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.userId } },
    select: { status: true },
  });

  if (!membership || membership.status !== 'active') {
    return NextResponse.json(
      { error: 'No tienes acceso a este espacio de trabajo.' },
      { status: 403 }
    );
  }

  await prisma.userPreference.upsert({
    where: { userId: session.userId },
    update: { preferredTenantId: tenantId },
    create: { userId: session.userId, preferredTenantId: tenantId },
  });

  return NextResponse.json({ ok: true, tenantId });
}
