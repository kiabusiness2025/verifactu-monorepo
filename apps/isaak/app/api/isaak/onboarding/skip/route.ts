// V1.5.1 — Marca el onboarding como saltado.
//
// POST /api/isaak/onboarding/skip
//
// Persiste onboardingCompletedAt=now() en IsaakOnboardingProfile. El
// usuario sigue pudiendo entrar a /bienvenida desde el sidebar para
// completar los pasos que quiera, pero el banner de "Termina el setup"
// del chat ya no aparece.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const tenantId = session.tenantId;
  const userId = session.userId;
  const now = new Date();

  await prisma.isaakOnboardingProfile.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      onboardingStartedAt: now,
      onboardingCompletedAt: now,
    },
    update: { onboardingCompletedAt: now },
  });

  return NextResponse.json({ ok: true, completedAt: now.toISOString() });
}
