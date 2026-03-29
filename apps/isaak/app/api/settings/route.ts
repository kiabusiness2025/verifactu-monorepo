import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getHoldedSession } from '@/app/lib/holded-session';
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

function parseEmployees(teamSize: string | null) {
  switch (teamSize) {
    case 'Solo yo':
      return 1;
    case '2-5 personas':
      return 5;
    case '6-20 personas':
      return 20;
    case 'Mas de 20':
      return 21;
    default:
      return null;
  }
}

export async function PATCH(req: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const section = typeof body.section === 'string' ? body.section : '';

  if (section === 'profile') {
    const firstName = normalizeText(body.firstName, 2);
    const phone = normalizeText(body.phone, 5);
    if (!firstName) {
      return NextResponse.json(
        { error: 'Escribe tu nombre de pila para continuar.' },
        { status: 400 }
      );
    }

    const [user, onboarding] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: { name: firstName },
        select: { id: true, name: true, email: true, image: true },
      }),
      prisma.isaakOnboardingProfile.upsert({
        where: {
          tenantId_userId: {
            tenantId: session.tenantId,
            userId: session.userId,
          },
        },
        update: {
          preferredName: firstName,
          phone,
        },
        create: {
          tenantId: session.tenantId,
          userId: session.userId,
          preferredName: firstName,
          phone,
          onboardingStartedAt: new Date(),
        },
        select: {
          preferredName: true,
          phone: true,
          roleInCompany: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      section: 'profile',
      data: {
        firstName: user.name ?? '',
        email: user.email ?? '',
        photoUrl: user.image ?? null,
        phone: onboarding.phone ?? null,
        roleInCompany: onboarding.roleInCompany ?? null,
      },
    });
  }

  if (section === 'company') {
    const tradeName = normalizeText(body.tradeName, 2);
    const legalName = normalizeText(body.legalName, 2);
    const activityMain = normalizeText(body.activityMain, 2);
    const sector = normalizeText(body.sector, 2);
    const address = normalizeText(body.address, 2);
    const postalCode = normalizeText(body.postalCode, 2);
    const city = normalizeText(body.city, 2);
    const province = normalizeText(body.province, 2);
    const country = normalizeText(body.country, 2);
    const taxId = normalizeText(body.taxId, 2);
    const representative = normalizeText(body.representative, 2);
    const website = normalizeText(body.website, 4);
    const phone = normalizeText(body.phone, 5);
    const teamSize = normalizeText(body.teamSize, 2);

    const profile = await prisma.tenantProfile.upsert({
      where: { tenantId: session.tenantId },
      update: {
        tradeName: tradeName || undefined,
        legalName: legalName || undefined,
        cnaeText: activityMain || undefined,
        cnae: sector || undefined,
        address: address || undefined,
        postalCode: postalCode || undefined,
        city: city || undefined,
        province: province || undefined,
        country: country || undefined,
        taxId: taxId || undefined,
        representative: representative || undefined,
        website: website || undefined,
        phone: phone || undefined,
        employees: parseEmployees(teamSize),
      },
      create: {
        tenantId: session.tenantId,
        source: 'manual',
        tradeName: tradeName || undefined,
        legalName: legalName || undefined,
        cnaeText: activityMain || undefined,
        cnae: sector || undefined,
        address: address || undefined,
        postalCode: postalCode || undefined,
        city: city || undefined,
        province: province || undefined,
        country: country || undefined,
        taxId: taxId || undefined,
        representative: representative || undefined,
        website: website || undefined,
        phone: phone || undefined,
        employees: parseEmployees(teamSize),
      },
      select: {
        tradeName: true,
        legalName: true,
        cnaeText: true,
        cnae: true,
        address: true,
        postalCode: true,
        city: true,
        province: true,
        country: true,
        taxId: true,
        representative: true,
        website: true,
        phone: true,
        employees: true,
      },
    });

    return NextResponse.json({
      ok: true,
      section: 'company',
      data: profile,
    });
  }

  if (section === 'isaak') {
    const preferredName = normalizeText(body.preferredName, 2);
    const communicationStyle = normalizeText(body.communicationStyle, 2);
    const likelyKnowledgeLevel = normalizeText(body.likelyKnowledgeLevel, 2);
    const mainGoals = parseGoals(body.mainGoals);

    const onboarding = await prisma.isaakOnboardingProfile.upsert({
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
      select: {
        preferredName: true,
        communicationStyle: true,
        likelyKnowledgeLevel: true,
        mainGoals: true,
      },
    });

    return NextResponse.json({
      ok: true,
      section: 'isaak',
      data: onboarding,
    });
  }

  return NextResponse.json({ error: 'Seccion no soportada.' }, { status: 400 });
}
