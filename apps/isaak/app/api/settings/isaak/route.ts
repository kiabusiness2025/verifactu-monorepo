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

  // V1.6.3 — Custom instructions del tenant. Texto libre que se inyecta
  // al system prompt del agente principal en todos los turnos. Se persiste
  // en Tenant.whitelabelConfig (Json libre que ya existía) bajo el sub-key
  // aiCustomInstructions — sin migración, sin colisión con el resto del
  // wrapper de whitelabel visual.
  const customInstructionsInput =
    typeof body.customInstructions === 'string' ? body.customInstructions.trim() : null;
  if (customInstructionsInput !== null) {
    const truncated = customInstructionsInput.slice(0, 2000);
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { whitelabelConfig: true },
    });
    const existing = (tenant?.whitelabelConfig ?? {}) as Record<string, unknown>;
    const nextConfig: Record<string, unknown> = {
      ...existing,
      aiCustomInstructions: truncated || undefined,
    };
    if (!truncated) delete nextConfig.aiCustomInstructions;
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: { whitelabelConfig: nextConfig as Prisma.InputJsonValue },
    });
  }

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
