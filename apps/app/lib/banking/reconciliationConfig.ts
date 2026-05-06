import prisma from '@/lib/prisma';

export type EffectiveReconciliationConfig = {
  amountToleranceEur: number;
  dateWindowDays: number;
  confidenceThreshold: number;
  autoMatchEnabled: boolean;
};

export const DEFAULT_RECONCILIATION_CONFIG: EffectiveReconciliationConfig = {
  amountToleranceEur: 1,
  dateWindowDays: 3,
  confidenceThreshold: 0.85,
  autoMatchEnabled: true,
};

export async function getEffectiveReconciliationConfig(
  tenantId: string
): Promise<EffectiveReconciliationConfig> {
  const stored = await prisma.bankReconciliationConfig.findUnique({
    where: { tenantId },
    select: {
      amountToleranceEur: true,
      dateWindowDays: true,
      confidenceThreshold: true,
      autoMatchEnabled: true,
    },
  });

  if (!stored) {
    return DEFAULT_RECONCILIATION_CONFIG;
  }

  return {
    amountToleranceEur: Number(stored.amountToleranceEur),
    dateWindowDays: stored.dateWindowDays,
    confidenceThreshold: stored.confidenceThreshold,
    autoMatchEnabled: stored.autoMatchEnabled,
  };
}
