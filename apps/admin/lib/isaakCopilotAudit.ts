// V3.4 — Audit log + rate limit del copilot Isaak admin.
//
// Audit log: cada acción admin_* ejecutada (confirm=true) se persiste en
// UsageEvent con source='isaak_copilot' y metadata.kind='action_executed'.
// Permite saber quién hizo qué con el copiloto y revertir si hace falta.
//
// Rate limit: máximo N mensajes por hora por admin (in-memory, simple).
// Evita abuso accidental (loop infinito de tools).

import { Prisma } from '@prisma/client';
import prisma from './prisma';

const MAX_MESSAGES_PER_HOUR = 60;
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

export function checkCopilotRateLimit(adminEmail: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(adminEmail);

  if (!entry || now > entry.resetAt) {
    const reset = now + 3600_000;
    RATE_LIMIT_MAP.set(adminEmail, { count: 1, resetAt: reset });
    return { allowed: true, remaining: MAX_MESSAGES_PER_HOUR - 1, resetAt: reset };
  }

  if (entry.count >= MAX_MESSAGES_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_MESSAGES_PER_HOUR - entry.count,
    resetAt: entry.resetAt,
  };
}

export type CopilotActionLogInput = {
  tool: string;
  args: Record<string, unknown>;
  adminEmail: string;
  adminUserId: string | null;
  tenantId?: string | null;
  resultPreview: string | null;
};

export async function logCopilotAction(input: CopilotActionLogInput): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        type: 'LEAD_CREATED', // sintáctico — discriminamos por metadata.kind
        source: 'isaak_copilot',
        userId: input.adminUserId ?? null,
        tenantId: input.tenantId ?? null,
        metadataJson: {
          kind: 'action_executed',
          tool: input.tool,
          args: JSON.parse(JSON.stringify(input.args)),
          adminEmail: input.adminEmail,
          resultPreview: input.resultPreview?.slice(0, 500) ?? null,
        } satisfies Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error('[isaak-copilot] audit log failed', err);
  }
}

export type CopilotActionRow = {
  id: string;
  createdAt: string;
  tool: string;
  adminEmail: string;
  tenantId: string | null;
  args: Record<string, unknown>;
};

export async function listCopilotActions(limit = 100): Promise<CopilotActionRow[]> {
  const rows = await prisma.usageEvent.findMany({
    where: { source: 'isaak_copilot' },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 500),
    select: { id: true, createdAt: true, tenantId: true, metadataJson: true },
  });

  return rows.map((r) => {
    const meta = (r.metadataJson ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      tool: typeof meta.tool === 'string' ? meta.tool : 'unknown',
      adminEmail: typeof meta.adminEmail === 'string' ? meta.adminEmail : 'unknown',
      tenantId: r.tenantId,
      args: (meta.args as Record<string, unknown>) ?? {},
    };
  });
}
