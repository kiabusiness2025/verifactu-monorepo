import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function writeHoldedActivity(input: {
  tenantId: string;
  userId?: string | null;
  action: string;
  status?: string;
  resourceType?: string;
  resourceId?: string | null;
  connectionId?: string | null;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
}) {
  return prisma.externalConnectionAuditLog.create({
    data: {
      tenantId: input.tenantId,
      connectionId: input.connectionId ?? null,
      userId: input.userId ?? null,
      channelType: 'holded_admin_mvp',
      action: input.action,
      resourceType: input.resourceType || 'holded_admin_event',
      resourceId: input.resourceId ?? null,
      status: input.status || 'success',
      requestPayload: (input.requestPayload ?? undefined) as Prisma.InputJsonValue | undefined,
      responsePayload: (input.responsePayload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
