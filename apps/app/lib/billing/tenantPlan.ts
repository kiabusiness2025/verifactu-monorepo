import prisma from '@/lib/prisma';

export async function getTenantPlanCode(tenantId: string): Promise<string | null> {
  const row = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ['trial', 'active'] } },
    orderBy: [{ createdAt: 'desc' }],
    include: { plan: { select: { code: true } } },
  });
  return row?.plan?.code?.toLowerCase() ?? null;
}

export type TenantFeatureFlags = {
  planCode: string | null;
  canExportAeatBooks: boolean;
  canUseAccountingApiIntegration: boolean;
  canBidirectionalQuotes: boolean;
};

export async function getTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlags> {
  const planCode = await getTenantPlanCode(tenantId);
  const paidIntegrationPlan = planCode === 'empresa' || planCode === 'pro';

  return {
    planCode,
    canExportAeatBooks: true,
    canUseAccountingApiIntegration: paidIntegrationPlan,
    canBidirectionalQuotes: paidIntegrationPlan,
  };
}

export async function canUseAccountingIntegration(tenantId: string): Promise<boolean> {
  const flags = await getTenantFeatureFlags(tenantId);
  return flags.canUseAccountingApiIntegration;
}

export async function canBidirectionalQuotes(tenantId: string): Promise<boolean> {
  const flags = await getTenantFeatureFlags(tenantId);
  return flags.canBidirectionalQuotes;
}
