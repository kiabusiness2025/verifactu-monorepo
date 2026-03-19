import prisma from '@/lib/prisma';

export type TenantFeatureFlags = {
  planCode: string | null;
  canExportAeatBooks: boolean;
  canUseAccountingApiIntegration: boolean;
  canBidirectionalQuotes: boolean;
};

export type AccountingIntegrationEntryChannel = 'dashboard' | 'chatgpt';

function normalizePlanCode(code: string | null | undefined) {
  return code?.trim().toLowerCase() || null;
}

function buildFlags(planCode: string | null): TenantFeatureFlags {
  const normalized = normalizePlanCode(planCode);
  const hasApiIntegration = normalized === 'empresa' || normalized === 'pro';

  return {
    planCode: normalized,
    canExportAeatBooks: true,
    canUseAccountingApiIntegration: hasApiIntegration,
    canBidirectionalQuotes: hasApiIntegration,
  };
}

export async function getTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlags> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: {
        in: ['active', 'trial', 'past_due'],
      },
    },
    orderBy: [
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      plan: {
        select: {
          code: true,
        },
      },
    },
  });

  return buildFlags(subscription?.plan.code ?? null);
}

export async function getAccountingIntegrationAccess(input: {
  tenantId: string;
  entryChannel?: AccountingIntegrationEntryChannel;
}) {
  const flags = await getTenantFeatureFlags(input.tenantId);
  const isHoldedFirst = input.entryChannel === 'chatgpt';

  if (isHoldedFirst) {
    return {
      ...flags,
      canUseAccountingApiIntegration: true,
      canConnect: true,
      connectionMode: 'holded_first',
    } as const;
  }

  return {
    ...flags,
    canConnect: flags.canUseAccountingApiIntegration,
    connectionMode: 'verifactu_first',
  } as const;
}

export async function canUseAccountingIntegration(tenantId: string) {
  const flags = await getTenantFeatureFlags(tenantId);
  return flags.canUseAccountingApiIntegration;
}

export async function canBidirectionalQuotes(tenantId: string) {
  const flags = await getTenantFeatureFlags(tenantId);
  return flags.canBidirectionalQuotes;
}
