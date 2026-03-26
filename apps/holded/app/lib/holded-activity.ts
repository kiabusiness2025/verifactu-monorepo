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
  try {
    return await prisma.externalConnectionAuditLog.create({
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
  } catch (error) {
    console.warn('[holded activity] audit log skipped', {
      action: input.action,
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
