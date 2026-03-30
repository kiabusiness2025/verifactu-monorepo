import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function normalizeText(value: unknown, min = 1) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length >= min ? normalized : null;
}

function parseGoals(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function requireSession() {
  return toSettingsSession(await getHoldedSession());
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.isaak });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const preferredName = normalizeText(body.preferredName, 2);
  const communicationStyle = normalizeText(body.communicationStyle, 2);
  const likelyKnowledgeLevel = normalizeText(body.likelyKnowledgeLevel, 2);
  const mainGoals = parseGoals(body.mainGoals);

  await prisma.isaakOnboardingProfile.upsert({
    where: {
      tenantId_userId: {
        tenantId: session.tenantId,
        userId: session.userId,
      },
    },
    update: {
      preferredName: preferredName || undefined,
      communicationStyle: communicationStyle || undefined,
      likelyKnowledgeLevel: likelyKnowledgeLevel || undefined,
      mainGoals: mainGoals as Prisma.InputJsonValue,
    },
    create: {
      tenantId: session.tenantId,
      userId: session.userId,
      preferredName: preferredName || undefined,
      communicationStyle: communicationStyle || 'spanish_clear_non_technical',
      likelyKnowledgeLevel: likelyKnowledgeLevel || 'starter',
      mainGoals: mainGoals as Prisma.InputJsonValue,
      onboardingStartedAt: new Date(),
    },
  });

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.isaak });
}
