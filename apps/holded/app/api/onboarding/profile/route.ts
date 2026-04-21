import { getHoldedConnection } from '@/app/lib/holded-integration';
import {
  completeHoldedOnboardingProfile,
  saveHoldedOnboardingDraft,
  type HoldedContextSnapshot,
  type HoldedOnboardingMainGoal,
  type HoldedOnboardingProfileInput,
  type HoldedOnboardingRoleInCompany,
} from '@/app/lib/holded-onboarding';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { isLikelySpanishPhone, parseHoldedRoleValue } from '@verifactu/utils';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function cleanOptional(value: unknown) {
  return cleanText(value);
}

function parseRole(value: unknown): HoldedOnboardingRoleInCompany | null {
  return parseHoldedRoleValue(value) as HoldedOnboardingRoleInCompany | null;
}

function parseGoals(value: unknown): HoldedOnboardingMainGoal[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<HoldedOnboardingMainGoal>([
    'Entender mi contabilidad',
    'Resolver dudas fiscales',
    'Emitir facturas facilmente',
    'Controlar ingresos y gastos',
    'Entender balances y resultados',
    'Llevar mejor la gestion diaria',
  ]);

  return value.filter(
    (item): item is HoldedOnboardingMainGoal =>
      typeof item === 'string' && allowed.has(item as HoldedOnboardingMainGoal)
  );
}

function buildHoldedContext(
  connection: Awaited<ReturnType<typeof getHoldedConnection>>
): HoldedContextSnapshot {
  return {
    tenantName: connection?.tenantName ?? null,
    legalName: connection?.legalName ?? null,
    taxId: connection?.taxId ?? null,
    supportedModules: connection?.supportedModules ?? [],
    validationSummary: connection?.validationSummary ?? null,
    connectedAt: connection?.connectedAt ?? null,
    lastValidatedAt: connection?.lastValidatedAt ?? null,
  };
}

function buildConnectionHandoff(connection: Awaited<ReturnType<typeof getHoldedConnection>>) {
  if (!connection?.keyMasked) return null;

  return {
    status: connection.status,
    keyMasked: connection.keyMasked,
    connectedAt: connection.connectedAt,
    lastValidatedAt: connection.lastValidatedAt,
    supportedModules: connection.supportedModules,
    validationSummary: connection.validationSummary,
    tenantName: connection.tenantName,
    legalName: connection.legalName,
    taxId: connection.taxId,
  };
}

function buildDraft(body: Record<string, unknown>) {
  return {
    preferredName: cleanOptional(body.preferredName) ?? undefined,
    companyName: cleanOptional(body.companyName) ?? undefined,
    roleInCompany: parseRole(body.roleInCompany) ?? undefined,
    roleInCompanyOther: cleanOptional(body.roleInCompanyOther) ?? undefined,
    businessSector: cleanOptional(body.businessSector) ?? undefined,
    companySectorCode: cleanOptional(body.companySectorCode) ?? undefined,
    companyAddress: cleanOptional(body.companyAddress) ?? undefined,
    teamSize: cleanOptional(body.teamSize) ?? undefined,
    website: cleanOptional(body.website) ?? undefined,
    phone: cleanOptional(body.phone) ?? undefined,
    mainGoals: parseGoals(body.mainGoals),
  };
}

function validateComplete(body: Record<string, unknown>): HoldedOnboardingProfileInput | string {
  const preferredName = cleanText(body.preferredName);
  const companyName = cleanText(body.companyName);
  const roleInCompany = parseRole(body.roleInCompany);
  const businessSector = cleanText(body.businessSector);
  const companySectorCode = cleanText(body.companySectorCode);
  const companyAddress = cleanText(body.companyAddress);
  const phone = cleanText(body.phone);
  const mainGoals = parseGoals(body.mainGoals);

  if (!preferredName) return 'Necesito saber como prefieres que te llame.';
  if (!companyName) return 'Necesito el nombre de tu empresa para continuar.';
  if (!roleInCompany) return 'Elige tu rol en la empresa para continuar.';
  if (mainGoals.length === 0) return 'Elige al menos una prioridad para continuar.';
  if (phone && !isLikelySpanishPhone(phone)) {
    return 'El telefono no parece valido para Espana. Revisa el formato.';
  }

  return {
    preferredName,
    companyName,
    roleInCompany,
    roleInCompanyOther: cleanOptional(body.roleInCompanyOther),
    businessSector: businessSector || 'Pendiente de completar',
    companySectorCode,
    companyAddress,
    teamSize: cleanOptional(body.teamSize),
    website: cleanOptional(body.website),
    phone,
    mainGoals,
  };
}

export async function POST(req: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connection = await getHoldedConnection(session.tenantId, 'dashboard');
  if (!connection?.keyMasked) {
    return NextResponse.json({ error: 'Conecta Holded antes de continuar.' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = body.mode === 'complete' ? 'complete' : 'draft';
  const holdedContext = buildHoldedContext(connection);

  if (mode === 'draft') {
    const draft = buildDraft(body);
    await saveHoldedOnboardingDraft({
      prisma,
      tenantId: session.tenantId,
      userId: session.userId,
      draft,
    });
    return NextResponse.json({ ok: true });
  }

  const validated = validateComplete(body);
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  const result = await completeHoldedOnboardingProfile({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
    profile: validated,
    holdedContext,
  });

  try {
    await prisma.tenantProfile.upsert({
      where: { tenantId: session.tenantId },
      create: {
        tenantId: session.tenantId,
        source: 'manual',
        cnaeCode: validated.companySectorCode || undefined,
        cnaeText: validated.businessSector || undefined,
        cnae: validated.businessSector || undefined,
        address: validated.companyAddress || undefined,
      },
      update: {
        cnaeCode: validated.companySectorCode || undefined,
        cnaeText: validated.businessSector || undefined,
        cnae: validated.businessSector || undefined,
        address: validated.companyAddress || undefined,
      },
    });
  } catch (tenantProfileError) {
    console.error('holded onboarding profile tenant profile sync failed', tenantProfileError);
  }

  return NextResponse.json({
    ok: true,
    profile: result.profile,
    instructions: result.instructions,
    connection: buildConnectionHandoff(connection),
  });
}
