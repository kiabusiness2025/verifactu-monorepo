import type { Prisma, PrismaClient } from '@prisma/client';

export const ISAAK_ONBOARDING_PROFILE_FACT_KEY = 'isaak_onboarding_profile';
export const ISAAK_ONBOARDING_DRAFT_FACT_KEY = 'isaak_onboarding_draft';
export const ISAAK_INSTRUCTION_PROFILE_FACT_KEY = 'isaak_instruction_profile';
export const ISAAK_ONBOARDING_CATEGORY = 'assistant_profile';
export const ISAAK_ONBOARDING_SCOPE = 'user';

export type IsaakRoleInCompany = 'autonomo' | 'administrador' | 'gerente' | 'financiero' | 'otro';

export type IsaakMainGoal =
  | 'Entender mi contabilidad'
  | 'Resolver dudas fiscales'
  | 'Emitir facturas facilmente'
  | 'Controlar ingresos y gastos'
  | 'Entender balances y resultados'
  | 'Llevar mejor la gestion diaria';

export type IsaakOnboardingProfileInput = {
  preferredName: string;
  companyName: string;
  roleInCompany: IsaakRoleInCompany;
  roleInCompanyOther?: string | null;
  businessSector: string;
  teamSize?: string | null;
  website?: string | null;
  phone?: string | null;
  mainGoals: IsaakMainGoal[];
};

export type HoldedContextSnapshot = {
  tenantName?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  supportedModules?: string[];
  validationSummary?: string | null;
  connectedAt?: string | null;
  lastValidatedAt?: string | null;
};

export type IsaakOnboardingProfile = IsaakOnboardingProfileInput & {
  communicationStyle: 'spanish_clear_non_technical';
  likelyKnowledgeLevel: 'starter' | 'intermediate';
  onboardingCompletedAt: string | null;
};

export type IsaakInstructionProfile = {
  communicationStyle: 'spanish_clear_non_technical';
  likelyKnowledgeLevel: 'starter' | 'intermediate';
  mainSupportGoals: IsaakMainGoal[];
  businessContextSummary: string;
  isaakInstructionProfile: string;
  holdedContextSnapshot: HoldedContextSnapshot;
  suggestedPrompts: string[];
};

export type IsaakOnboardingState = {
  completed: boolean;
  profile: IsaakOnboardingProfile | null;
  draft: Partial<IsaakOnboardingProfileInput> | null;
  instructions: IsaakInstructionProfile | null;
};

type IsaakOnboardingPrismaClient = PrismaClient;

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') || null;
}

function isMissingOnboardingStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('does not exist in the current database') ||
    message.includes('The table public.isaak_memory_facts does not exist') ||
    message.includes('relation "isaak_memory_facts" does not exist') ||
    message.includes('The table public.user_onboarding does not exist') ||
    message.includes('relation "user_onboarding" does not exist')
  );
}

function normalizeGoals(goals: string[] | null | undefined): IsaakMainGoal[] {
  const allowed = new Set<IsaakMainGoal>([
    'Entender mi contabilidad',
    'Resolver dudas fiscales',
    'Emitir facturas facilmente',
    'Controlar ingresos y gastos',
    'Entender balances y resultados',
    'Llevar mejor la gestion diaria',
  ]);

  return (goals || []).filter((goal): goal is IsaakMainGoal => allowed.has(goal as IsaakMainGoal));
}

function dedupePrompts(values: string[]) {
  return Array.from(new Set(values));
}

export function buildSuggestedPrompts(goals: IsaakMainGoal[]) {
  const prompts: string[] = [];

  for (const goal of goals) {
    switch (goal) {
      case 'Entender mi contabilidad':
        prompts.push('Explicame mis numeros de este mes');
        prompts.push('Cuanto he ganado este mes?');
        break;
      case 'Resolver dudas fiscales':
        prompts.push('Que gastos pueden ser deducibles?');
        prompts.push('Ayudame a entender una duda fiscal');
        break;
      case 'Emitir facturas facilmente':
        prompts.push('Hazme una factura');
        prompts.push('Crea un presupuesto');
        break;
      case 'Controlar ingresos y gastos':
        prompts.push('Que gastos tengo pendientes?');
        prompts.push('Como van mis ingresos y gastos este mes?');
        break;
      case 'Entender balances y resultados':
        prompts.push('Explicame este balance');
        prompts.push('Como va mi resultado este mes?');
        break;
      case 'Llevar mejor la gestion diaria':
        prompts.push('Que deberia revisar hoy?');
        prompts.push('Dame un resumen rapido del negocio');
        break;
    }
  }

  prompts.push('Ver resumen del negocio');
  return dedupePrompts(prompts).slice(0, 6);
}

function buildKnowledgeLevel(roleInCompany: IsaakRoleInCompany, goals: IsaakMainGoal[]) {
  if (
    roleInCompany === 'financiero' ||
    goals.includes('Entender balances y resultados') ||
    goals.includes('Entender mi contabilidad')
  ) {
    return 'intermediate' as const;
  }

  return 'starter' as const;
}

function buildBusinessContextSummary(
  profile: IsaakOnboardingProfileInput,
  holdedContext: HoldedContextSnapshot
) {
  const company = profile.companyName || holdedContext.tenantName || 'la empresa';
  const role = profile.roleInCompanyOther || profile.roleInCompany;
  const sector = profile.businessSector || 'actividad no especificada';
  const team = normalizeText(profile.teamSize);
  const goalList = profile.mainGoals.slice(0, 3).join(', ');
  const modules = (holdedContext.supportedModules || []).slice(0, 4).join(', ');

  const parts = [
    `${profile.preferredName} trabaja en ${company} como ${role}.`,
    `La actividad principal es ${sector}.`,
    team ? `El equipo es ${team}.` : null,
    goalList ? `Necesita ayuda sobre: ${goalList}.` : null,
    modules ? `Holded tiene disponibles: ${modules}.` : null,
  ];

  return parts.filter(Boolean).join(' ');
}

function buildInstructionProfile(
  profile: IsaakOnboardingProfileInput,
  holdedContext: HoldedContextSnapshot
): IsaakInstructionProfile {
  const likelyKnowledgeLevel = buildKnowledgeLevel(profile.roleInCompany, profile.mainGoals);
  const businessContextSummary = buildBusinessContextSummary(profile, holdedContext);
  const goalSummary = profile.mainGoals.slice(0, 3).join(', ');

  return {
    communicationStyle: 'spanish_clear_non_technical',
    likelyKnowledgeLevel,
    mainSupportGoals: profile.mainGoals,
    businessContextSummary,
    holdedContextSnapshot: holdedContext,
    suggestedPrompts: buildSuggestedPrompts(profile.mainGoals),
    isaakInstructionProfile: [
      'Habla siempre en espanol claro, cercano y no tecnico.',
      'No sustituyas al asesor del usuario, pero ayuda de forma inmediata y practica.',
      `Dirigete a la persona como ${profile.preferredName}.`,
      `Prioriza estos focos: ${goalSummary}.`,
      `Contexto del negocio: ${businessContextSummary}`,
    ].join(' '),
  };
}

function parseJsonValue<T>(value: Prisma.JsonValue | null): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as T;
}

async function readFact(
  prisma: IsaakOnboardingPrismaClient,
  tenantId: string,
  userId: string,
  factKey: string
) {
  return prisma.isaakMemoryFact.findFirst({
    where: {
      tenantId,
      userId,
      category: ISAAK_ONBOARDING_CATEGORY,
      factKey,
    },
    orderBy: { updatedAt: 'desc' },
    select: { valueJson: true, updatedAt: true },
  });
}

export async function getIsaakOnboardingState(input: {
  prisma: IsaakOnboardingPrismaClient;
  tenantId: string;
  userId: string;
}): Promise<IsaakOnboardingState> {
  try {
    const [profileFact, draftFact, instructionFact, userOnboarding] = await Promise.all([
      readFact(input.prisma, input.tenantId, input.userId, ISAAK_ONBOARDING_PROFILE_FACT_KEY),
      readFact(input.prisma, input.tenantId, input.userId, ISAAK_ONBOARDING_DRAFT_FACT_KEY),
      readFact(input.prisma, input.tenantId, input.userId, ISAAK_INSTRUCTION_PROFILE_FACT_KEY),
      input.prisma.userOnboarding.findUnique({
        where: { userId: input.userId },
        select: { completedAt: true },
      }),
    ]);

    const profile = parseJsonValue<IsaakOnboardingProfile>(profileFact?.valueJson ?? null);
    const draft = parseJsonValue<Partial<IsaakOnboardingProfileInput>>(
      draftFact?.valueJson ?? null
    );
    const instructions = parseJsonValue<IsaakInstructionProfile>(
      instructionFact?.valueJson ?? null
    );

    return {
      completed: Boolean(profile?.onboardingCompletedAt || userOnboarding?.completedAt),
      profile,
      draft,
      instructions,
    };
  } catch (error) {
    if (isMissingOnboardingStorageError(error)) {
      try {
        const userOnboarding = await input.prisma.userOnboarding.findUnique({
          where: { userId: input.userId },
          select: { completedAt: true },
        });

        return {
          completed: Boolean(userOnboarding?.completedAt),
          profile: null,
          draft: null,
          instructions: null,
        };
      } catch {
        // fall through to empty state below
      }

      return {
        completed: false,
        profile: null,
        draft: null,
        instructions: null,
      };
    }

    throw error;
  }
}

export async function saveIsaakOnboardingDraft(input: {
  prisma: IsaakOnboardingPrismaClient;
  tenantId: string;
  userId: string;
  draft: Partial<IsaakOnboardingProfileInput>;
}) {
  const now = new Date();

  try {
    await input.prisma.$transaction([
      input.prisma.isaakMemoryFact.deleteMany({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          category: ISAAK_ONBOARDING_CATEGORY,
          factKey: ISAAK_ONBOARDING_DRAFT_FACT_KEY,
        },
      }),
      input.prisma.isaakMemoryFact.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          scope: ISAAK_ONBOARDING_SCOPE,
          category: ISAAK_ONBOARDING_CATEGORY,
          factKey: ISAAK_ONBOARDING_DRAFT_FACT_KEY,
          valueJson: input.draft as Prisma.InputJsonValue,
          source: 'holded_onboarding',
          lastConfirmedAt: now,
        },
      }),
    ]);
  } catch (error) {
    if (isMissingOnboardingStorageError(error)) {
      return;
    }

    throw error;
  }
}

export async function completeIsaakOnboarding(input: {
  prisma: IsaakOnboardingPrismaClient;
  tenantId: string;
  userId: string;
  profile: IsaakOnboardingProfileInput;
  holdedContext: HoldedContextSnapshot;
}) {
  const now = new Date();
  const normalizedProfile: IsaakOnboardingProfile = {
    preferredName: normalizeText(input.profile.preferredName) || 'Hola',
    companyName:
      normalizeText(input.profile.companyName) || input.holdedContext.tenantName || 'tu empresa',
    roleInCompany: input.profile.roleInCompany,
    roleInCompanyOther: normalizeText(input.profile.roleInCompanyOther),
    businessSector: normalizeText(input.profile.businessSector) || 'Actividad general',
    teamSize: normalizeText(input.profile.teamSize),
    website: normalizeText(input.profile.website),
    phone: normalizeText(input.profile.phone),
    mainGoals: normalizeGoals(input.profile.mainGoals),
    communicationStyle: 'spanish_clear_non_technical',
    likelyKnowledgeLevel: buildKnowledgeLevel(
      input.profile.roleInCompany,
      normalizeGoals(input.profile.mainGoals)
    ),
    onboardingCompletedAt: now.toISOString(),
  };

  const instructions = buildInstructionProfile(normalizedProfile, input.holdedContext);

  const canonicalWrites = [
    input.prisma.user.update({
      where: { id: input.userId },
      data: { name: normalizedProfile.preferredName },
    }),
    input.prisma.tenantProfile.upsert({
      where: { tenantId: input.tenantId },
      update: {
        tradeName: normalizedProfile.companyName || undefined,
        website: normalizedProfile.website || undefined,
        phone: normalizedProfile.phone || undefined,
        representative: normalizedProfile.preferredName || undefined,
      },
      create: {
        tenantId: input.tenantId,
        source: 'holded',
        tradeName: normalizedProfile.companyName || undefined,
        website: normalizedProfile.website || undefined,
        phone: normalizedProfile.phone || undefined,
        representative: normalizedProfile.preferredName || undefined,
      },
    }),
    input.prisma.userOnboarding.upsert({
      where: { userId: input.userId },
      update: {
        completedAt: now,
      },
      create: {
        userId: input.userId,
        completedAt: now,
      },
    }),
  ];

  try {
    await input.prisma.$transaction([
      ...canonicalWrites,
      input.prisma.isaakMemoryFact.deleteMany({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          category: ISAAK_ONBOARDING_CATEGORY,
          factKey: {
            in: [
              ISAAK_ONBOARDING_PROFILE_FACT_KEY,
              ISAAK_INSTRUCTION_PROFILE_FACT_KEY,
              ISAAK_ONBOARDING_DRAFT_FACT_KEY,
            ],
          },
        },
      }),
      input.prisma.isaakMemoryFact.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          scope: ISAAK_ONBOARDING_SCOPE,
          category: ISAAK_ONBOARDING_CATEGORY,
          factKey: ISAAK_ONBOARDING_PROFILE_FACT_KEY,
          valueJson: normalizedProfile as Prisma.InputJsonValue,
          source: 'holded_onboarding',
          lastConfirmedAt: now,
        },
      }),
      input.prisma.isaakMemoryFact.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          scope: ISAAK_ONBOARDING_SCOPE,
          category: ISAAK_ONBOARDING_CATEGORY,
          factKey: ISAAK_INSTRUCTION_PROFILE_FACT_KEY,
          valueJson: instructions as Prisma.InputJsonValue,
          source: 'holded_onboarding',
          lastConfirmedAt: now,
        },
      }),
    ]);
  } catch (error) {
    if (!isMissingOnboardingStorageError(error)) {
      throw error;
    }

    await input.prisma.$transaction(canonicalWrites);
  }

  return {
    profile: normalizedProfile,
    instructions,
  };
}
