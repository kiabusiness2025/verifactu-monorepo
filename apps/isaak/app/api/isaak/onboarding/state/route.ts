// V1.5.1 — Estado del onboarding del workspace.
//
// GET /api/isaak/onboarding/state
//
// Devuelve qué pasos del onboarding faltan por completar:
//   - profile:   perfil de empresa con datos mínimos (preferredName + sector)
//   - holded:    integración Holded conectada
//   - push:      al menos una suscripción push activa
//   - channels:  WhatsApp o Telegram vinculados
//
// También indica si el usuario ya marcó el onboarding como completado
// (skip o auto-completado al conectar Holded en otra sesión).

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const tenantId = session.tenantId;
  const userId = session.userId;

  const [profile, holdedConn, pushCount, waLinked, tgLinked] = await Promise.all([
    prisma.isaakOnboardingProfile.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: {
        preferredName: true,
        businessSector: true,
        teamSize: true,
        roleInCompany: true,
        onboardingCompletedAt: true,
      },
    }),
    getHoldedConnection(tenantId).catch(() => null),
    prisma.isaakPushSubscription.count({ where: { tenantId, userId } }),
    prisma.whatsAppThread
      .count({ where: { tenantId, consentAt: { not: null } } })
      .catch(() => 0),
    prisma.telegramChat.count({ where: { tenantId } }).catch(() => 0),
  ]);

  const profileDone = !!(
    profile?.preferredName &&
    profile.businessSector &&
    profile.businessSector !== 'Actividad general'
  );
  const holdedDone = !!(holdedConn as { apiKey?: string } | null)?.apiKey;
  const pushDone = pushCount > 0;
  const channelsDone = waLinked > 0 || tgLinked > 0;

  const totalSteps = 4;
  const doneCount = [profileDone, holdedDone, pushDone, channelsDone].filter(Boolean).length;
  const allDone = doneCount === totalSteps;
  const skipped = !!profile?.onboardingCompletedAt && !allDone;

  return NextResponse.json({
    completedAt: profile?.onboardingCompletedAt?.toISOString() ?? null,
    allDone,
    skipped,
    doneCount,
    totalSteps,
    steps: {
      profile: {
        done: profileDone,
        preferredName: profile?.preferredName ?? null,
        businessSector: profile?.businessSector ?? null,
      },
      holded: { done: holdedDone },
      push: { done: pushDone, count: pushCount },
      channels: {
        done: channelsDone,
        whatsapp: waLinked > 0,
        telegram: tgLinked > 0,
      },
    },
  });
}
