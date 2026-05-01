import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';

type AuditEntry = {
  ctx: IsaakExecutionContext;
  method: string;
  endpoint: string;
  toolOrAction?: string;
  status: number;
  durationMs?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  confirmationRequired?: boolean;
  ip?: string;
  meta?: Record<string, unknown>;
  keyId?: string;
};

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await prisma.isaakApiAuditLog.create({
      data: {
        requestId: entry.ctx.requestId,
        tenantId: entry.ctx.tenantId,
        userId: entry.ctx.userId || null,
        keyId: entry.keyId ?? null,
        channel: entry.ctx.channel,
        method: entry.method,
        endpoint: entry.endpoint,
        toolOrAction: entry.toolOrAction ?? null,
        status: entry.status,
        durationMs: entry.durationMs ?? null,
        riskLevel: entry.riskLevel ?? null,
        confirmationRequired: entry.confirmationRequired ?? false,
        ip: entry.ip ?? null,
        meta: (entry.meta ?? null) as never,
      },
    });
  } catch (err) {
    // Audit logging must never block or crash the main request
    console.error('[isaak-platform] audit log failed', err);
  }
}

export function withTiming<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = Date.now();
  return fn().then((result) => [result, Date.now() - start]);
}
