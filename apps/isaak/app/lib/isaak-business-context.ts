import type { IsaakInstructionProfile, IsaakOnboardingProfile } from '@verifactu/integrations';
import { getIsaakOnboardingState } from '@verifactu/integrations';
import {
  buildHoldedAnalyticsSummary,
  type HoldedAnalyticsSummary,
  type HoldedSnapshot,
} from '@/app/lib/holded-analytics';
import {
  fetchHoldedSnapshot,
  getHoldedConnection,
  type HoldedConnectionRecord,
} from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';

type BusinessSession = {
  tenantId: string;
  userId: string;
  name?: string | null;
  email?: string | null;
};

type TenantProfileRecord = {
  source: string;
  representative: string | null;
  tradeName: string | null;
  legalName: string | null;
  taxId: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  cnae: string | null;
  cnaeText: string | null;
  employees: number | null;
};

type UserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
};

export type IsaakBusinessContext = {
  user: UserRecord | null;
  company: {
    tradeName: string | null;
    legalName: string | null;
    taxId: string | null;
    representative: string | null;
    website: string | null;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    sectorCode: string | null;
    sectorLabel: string | null;
    employees: number | null;
    teamSizeLabel: string | null;
  };
  companyProfile: TenantProfileRecord | null;
  holded: {
    connection: HoldedConnectionRecord | null;
    snapshot: HoldedSnapshot | null;
    analytics: HoldedAnalyticsSummary | null;
    hasLiveConnection: boolean;
  };
  isaak: {
    completed: boolean;
    profile: IsaakOnboardingProfile | null;
    instructions: IsaakInstructionProfile | null;
  };
  labels: {
    companyName: string | null;
    legalName: string | null;
    taxId: string | null;
    firstName: string;
  };
  summary: string;
};

function takeFirstName(value: string | null | undefined) {
  const normalized = (value || '').trim();
  if (!normalized) return '';
  return normalized.split(' ')[0]?.trim() || normalized;
}

function employeesToLabel(value: number | null | undefined) {
  if (!value || value <= 1) return 'Solo yo';
  if (value <= 5) return '2-5 personas';
  if (value <= 20) return '6-20 personas';
  return 'Mas de 20';
}

function buildFallbackProfile(input: {
  session: { name: string | null; email: string | null };
  connection: {
    tenantName: string | null;
    legalName: string | null;
  };
  tenantProfile: TenantProfileRecord | null;
}): IsaakOnboardingProfile {
  return {
    preferredName:
      input.session.name ||
      input.tenantProfile?.representative ||
      input.session.email?.split('@')[0] ||
      'Hola',
    companyName:
      input.tenantProfile?.tradeName ||
      input.tenantProfile?.legalName ||
      input.connection.tenantName ||
      input.connection.legalName ||
      'tu empresa',
    roleInCompany: 'otro',
    roleInCompanyOther: null,
    businessSector: input.tenantProfile?.cnaeText || 'Actividad general',
    teamSize: employeesToLabel(input.tenantProfile?.employees),
    website: input.tenantProfile?.website || null,
    phone: input.tenantProfile?.phone || null,
    mainGoals: [],
    communicationStyle: 'spanish_clear_non_technical',
    likelyKnowledgeLevel: 'starter',
    onboardingCompletedAt: new Date().toISOString(),
  };
}

function buildContextSummary(input: {
  companyName: string | null;
  sector: string | null;
  representative: string | null;
  profile: IsaakOnboardingProfile | null;
  connection: HoldedConnectionRecord | null;
  analytics: HoldedAnalyticsSummary | null;
}) {
  const company = input.companyName || 'la empresa';
  const parts = [`Empresa activa: ${company}.`];

  if (input.sector) {
    parts.push(`Actividad: ${input.sector}.`);
  }

  if (input.representative) {
    parts.push(`Responsable visible: ${input.representative}.`);
  }

  if (input.profile?.roleInCompanyOther || input.profile?.roleInCompany) {
    parts.push(
      `Rol de la persona usuaria: ${input.profile.roleInCompanyOther || input.profile.roleInCompany}.`
    );
  }

  if (input.profile?.mainGoals?.length) {
    parts.push(`Objetivos de Isaak: ${input.profile.mainGoals.slice(0, 3).join(', ')}.`);
  }

  if (input.connection?.supportedModules?.length) {
    parts.push(`Modulos Holded validados: ${input.connection.supportedModules.join(', ')}.`);
  }

  if (input.analytics) {
    parts.push(
      `Ventas mes: ${input.analytics.monthSales.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} EUR.`
    );

    if (typeof input.analytics.monthExpenses === 'number') {
      parts.push(
        `Gastos mes: ${input.analytics.monthExpenses.toLocaleString('es-ES', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} EUR.`
      );
    }

    if (input.analytics.pendingCollectionsAmount > 0) {
      parts.push(
        `Cobros pendientes: ${input.analytics.pendingCollectionsAmount.toLocaleString('es-ES', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} EUR.`
      );
    }
  }

  return parts.join(' ');
}

function resolvePreferredCompanyName(input: {
  tenantProfile: TenantProfileRecord | null;
  onboardingProfile: IsaakOnboardingProfile | null;
  connection: HoldedConnectionRecord | null;
}) {
  const manualTradeName =
    input.tenantProfile && input.tenantProfile.source !== 'holded'
      ? input.tenantProfile.tradeName
      : null;
  const manualLegalName =
    input.tenantProfile && input.tenantProfile.source !== 'holded'
      ? input.tenantProfile.legalName
      : null;
  const holdedSyncedTradeName =
    input.tenantProfile && input.tenantProfile.source === 'holded'
      ? input.tenantProfile.tradeName
      : null;
  const holdedSyncedLegalName =
    input.tenantProfile && input.tenantProfile.source === 'holded'
      ? input.tenantProfile.legalName
      : null;

  const companyName =
    manualTradeName ||
    input.onboardingProfile?.companyName ||
    manualLegalName ||
    holdedSyncedTradeName ||
    input.connection?.tenantName ||
    holdedSyncedLegalName ||
    input.connection?.legalName ||
    null;

  const legalName =
    manualLegalName ||
    holdedSyncedLegalName ||
    input.connection?.legalName ||
    input.onboardingProfile?.companyName ||
    companyName;

  return {
    companyName,
    legalName,
  };
}

export async function loadIsaakBusinessContext(
  session: BusinessSession,
  options?: {
    includeSnapshot?: boolean;
  }
): Promise<IsaakBusinessContext> {
  const [user, tenantProfile, connection, onboardingState] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
      },
    }),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        source: true,
        representative: true,
        tradeName: true,
        legalName: true,
        taxId: true,
        website: true,
        phone: true,
        address: true,
        postalCode: true,
        city: true,
        province: true,
        country: true,
        cnae: true,
        cnaeText: true,
        employees: true,
      },
    }),
    getHoldedConnection(session.tenantId).catch((error) => {
      console.error('[isaak context] holded connection read failed', error);
      return null;
    }),
    getIsaakOnboardingState({
      prisma,
      tenantId: session.tenantId,
      userId: session.userId,
    }).catch((error) => {
      console.error('[isaak context] onboarding state read failed', error);
      return {
        completed: false,
        profile: null,
        draft: null,
        instructions: null,
      };
    }),
  ]);

  const snapshot =
    connection?.apiKey && connection.status !== 'disconnected'
      ? await fetchHoldedSnapshot(connection.apiKey)
          .then((result) => result)
          .catch((error) => {
            console.error('[isaak context] holded snapshot read failed', error);
            return null;
          })
      : null;
  const analytics = snapshot ? buildHoldedAnalyticsSummary(snapshot) : null;

  const effectiveCompleted = onboardingState.completed;
  const effectiveProfile =
    onboardingState.profile ||
    (effectiveCompleted
      ? buildFallbackProfile({
          session: {
            name: user?.name ?? session.name ?? null,
            email: user?.email ?? session.email ?? null,
          },
          connection: {
            tenantName: tenantProfile?.tradeName ?? connection?.tenantName ?? null,
            legalName: tenantProfile?.legalName ?? connection?.legalName ?? null,
          },
          tenantProfile,
        })
      : null);

  const resolvedCompany = resolvePreferredCompanyName({
    tenantProfile,
    onboardingProfile: effectiveProfile,
    connection,
  });
  const companyName = resolvedCompany.companyName;
  const legalName = resolvedCompany.legalName;
  const taxId = connection?.taxId ?? tenantProfile?.taxId ?? null;
  const firstName =
    takeFirstName(effectiveProfile?.preferredName) ||
    takeFirstName(user?.name || session.name) ||
    takeFirstName(tenantProfile?.representative) ||
    takeFirstName(session.email?.split('@')[0]) ||
    'Hola';

  return {
    user,
    companyProfile: tenantProfile,
    company: {
      tradeName: companyName,
      legalName,
      taxId,
      representative: tenantProfile?.representative ?? user?.name ?? null,
      website: tenantProfile?.website ?? effectiveProfile?.website ?? null,
      phone: tenantProfile?.phone ?? effectiveProfile?.phone ?? user?.phone ?? null,
      address: tenantProfile?.address ?? null,
      postalCode: tenantProfile?.postalCode ?? null,
      city: tenantProfile?.city ?? null,
      province: tenantProfile?.province ?? null,
      country: tenantProfile?.country ?? 'ES',
      sectorCode: tenantProfile?.cnae ?? null,
      sectorLabel: tenantProfile?.cnaeText ?? effectiveProfile?.businessSector ?? null,
      employees: tenantProfile?.employees ?? null,
      teamSizeLabel: effectiveProfile?.teamSize || employeesToLabel(tenantProfile?.employees),
    },
    holded: {
      connection,
      snapshot: options?.includeSnapshot ? snapshot : null,
      analytics,
      hasLiveConnection: Boolean(connection?.keyMasked),
    },
    isaak: {
      completed: effectiveCompleted,
      profile: effectiveProfile,
      instructions: onboardingState.instructions,
    },
    labels: {
      companyName,
      legalName,
      taxId,
      firstName,
    },
    summary: buildContextSummary({
      companyName,
      sector: tenantProfile?.cnaeText ?? effectiveProfile?.businessSector ?? null,
      representative: tenantProfile?.representative ?? user?.name ?? null,
      profile: effectiveProfile,
      connection,
      analytics,
    }),
  };
}
