import { NextResponse } from 'next/server';
import {
  completeIsaakOnboarding,
  saveIsaakOnboardingDraft,
  type HoldedContextSnapshot,
  type IsaakMainGoal,
  type IsaakOnboardingProfileInput,
  type IsaakRoleInCompany,
} from '@verifactu/integrations';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function cleanOptional(value: unknown) {
  return cleanText(value);
}

function parseRole(value: unknown): IsaakRoleInCompany | null {
  if (typeof value !== 'string') return null;
  if (
    value === 'autonomo' ||
    value === 'administrador' ||
    value === 'gerente' ||
    value === 'financiero' ||
    value === 'otro'
  ) {
    return value;
  }
  return null;
}

function parseGoals(value: unknown): IsaakMainGoal[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<IsaakMainGoal>([
    'Entender mi contabilidad',
    'Resolver dudas fiscales',
    'Emitir facturas facilmente',
    'Controlar ingresos y gastos',
    'Entender balances y resultados',
    'Llevar mejor la gestion diaria',
  ]);

  return value.filter(
    (item): item is IsaakMainGoal => typeof item === 'string' && allowed.has(item as IsaakMainGoal)
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
    teamSize: cleanOptional(body.teamSize) ?? undefined,
    website: cleanOptional(body.website) ?? undefined,
    phone: cleanOptional(body.phone) ?? undefined,
    mainGoals: parseGoals(body.mainGoals),
  };
}

function validateComplete(body: Record<string, unknown>): IsaakOnboardingProfileInput | string {
  const preferredName = cleanText(body.preferredName);
  const companyName = cleanText(body.companyName);
  const roleInCompany = parseRole(body.roleInCompany);
  const businessSector = cleanText(body.businessSector);
  const mainGoals = parseGoals(body.mainGoals);

  if (!preferredName) return 'Necesito saber como prefieres que te llame.';
  if (!companyName) return 'Necesito el nombre de tu empresa para adaptar Isaak.';
  if (!roleInCompany) return 'Elige tu rol en la empresa para continuar.';
  if (!businessSector) return 'Indica la actividad principal de tu empresa.';
  if (mainGoals.length === 0) return 'Elige al menos una prioridad para Isaak.';

  return {
    preferredName,
    companyName,
    roleInCompany,
    roleInCompanyOther: cleanOptional(body.roleInCompanyOther),
    businessSector,
    teamSize: cleanOptional(body.teamSize),
    website: cleanOptional(body.website),
    phone: cleanOptional(body.phone),
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
    return NextResponse.json(
      { error: 'Conecta Holded antes de continuar con Isaak.' },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = body.mode === 'complete' ? 'complete' : 'draft';
  const holdedContext = buildHoldedContext(connection);

  if (mode === 'draft') {
    const draft = buildDraft(body);
    await saveIsaakOnboardingDraft({
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

  const result = await completeIsaakOnboarding({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
    profile: validated,
    holdedContext,
  });

  return NextResponse.json({
    ok: true,
    profile: result.profile,
    instructions: result.instructions,
    connection: buildConnectionHandoff(connection),
  });
}
