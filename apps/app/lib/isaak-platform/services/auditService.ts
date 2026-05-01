import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';

export type AuditEventFilter = {
  from?: string;
  to?: string;
  channel?: string;
  riskLevel?: string;
  page?: number;
  limit?: number;
};

export async function listAuditEvents(
  ctx: IsaakExecutionContext,
  opts: AuditEventFilter = {}
): Promise<{
  items: Awaited<ReturnType<typeof prisma.isaakApiAuditLog.findMany>>;
  total: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (opts.channel) where.channel = opts.channel;
  if (opts.riskLevel) where.riskLevel = opts.riskLevel;
  if (opts.from || opts.to) {
    where.createdAt = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.isaakApiAuditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.isaakApiAuditLog.count({ where }),
  ]);

  return { items, total, page, limit };
}
