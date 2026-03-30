import type { Prisma, PrismaClient } from '@prisma/client';

export type CanonicalUsageEventType =
  | 'LEAD_CREATED'
  | 'EMAIL_VERIFIED'
  | 'LOGIN_COMPLETED'
  | 'HOLDED_CONNECTED'
  | 'ONBOARDING_STARTED'
  | 'ONBOARDING_COMPLETED'
  | 'ISAAK_CHAT_OPENED'
  | 'FIRST_CHAT_CREATED'
  | 'FIRST_MESSAGE_SENT'
  | 'SUMMARY_REQUESTED'
  | 'CONNECTION_ERROR'
  | 'PREMIUM_INTEREST_FLAGGED';

type UsageEventPrismaClient = Pick<PrismaClient, 'usageEvent'>;

export async function recordUsageEvent(input: {
  prisma: UsageEventPrismaClient;
  tenantId?: string | null;
  userId?: string | null;
  type: CanonicalUsageEventType;
  source?: string | null;
  path?: string | null;
  metadataJson?: Prisma.InputJsonValue | null;
}) {
  return input.prisma.usageEvent.create({
    data: {
      tenantId: input.tenantId || null,
      userId: input.userId || null,
      type: input.type,
      source: input.source || null,
      path: input.path || null,
      metadataJson: input.metadataJson ?? undefined,
    },
  });
}
