// V1.7.2 — Slash commands custom del tenant.
//
// GET → lista los slash commands custom configurados por este tenant.
// PUT → sustituye toda la lista (envía array completo de hasta 20).
//
// Persistencia: Tenant.whitelabelConfig.customSlashCommands (sub-key
// json libre que ya existía — coexiste con companyName/logoUrl/etc.
// y con aiCustomInstructions de V1.6.3 sin migración).

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

const MAX_COMMANDS = 20;
const MAX_TRIGGER_LEN = 24;
const MAX_LABEL_LEN = 40;
const MAX_DESCRIPTION_LEN = 120;
const MAX_EXPANSION_LEN = 600;

const TRIGGER_RE = /^[a-z][a-z0-9-]{0,23}$/;

export type CustomSlashCommand = {
  trigger: string;
  label: string;
  description: string;
  expansion: string;
};

function sanitize(raw: unknown): CustomSlashCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const trigger = typeof r.trigger === 'string' ? r.trigger.trim().toLowerCase() : '';
  const label = typeof r.label === 'string' ? r.label.trim() : '';
  const description = typeof r.description === 'string' ? r.description.trim() : '';
  const expansion = typeof r.expansion === 'string' ? r.expansion : '';

  if (!TRIGGER_RE.test(trigger)) return null;
  if (trigger.length > MAX_TRIGGER_LEN) return null;
  if (!label || label.length > MAX_LABEL_LEN) return null;
  if (description.length > MAX_DESCRIPTION_LEN) return null;
  if (!expansion || expansion.length > MAX_EXPANSION_LEN) return null;

  return { trigger, label, description, expansion };
}

async function loadConfig(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { whitelabelConfig: true },
  });
  const config = (tenant?.whitelabelConfig ?? {}) as Record<string, unknown>;
  const raw = config.customSlashCommands;
  const commands: CustomSlashCommand[] = Array.isArray(raw)
    ? raw.map((c) => sanitize(c)).filter((c): c is CustomSlashCommand => c !== null)
    : [];
  return { tenant, config, commands };
}

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { commands } = await loadConfig(session.tenantId);
  return NextResponse.json({ commands });
}

export async function PUT(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { commands?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!Array.isArray(body.commands)) {
    return NextResponse.json(
      { error: 'invalid_commands', message: '`commands` debe ser un array.' },
      { status: 400 },
    );
  }
  if (body.commands.length > MAX_COMMANDS) {
    return NextResponse.json(
      {
        error: 'too_many_commands',
        message: `Máx ${MAX_COMMANDS} slash commands custom por tenant.`,
      },
      { status: 400 },
    );
  }

  const sanitized: CustomSlashCommand[] = [];
  const seen = new Set<string>();
  for (const raw of body.commands) {
    const cmd = sanitize(raw);
    if (!cmd) continue;
    if (seen.has(cmd.trigger)) continue; // dedupe por trigger
    seen.add(cmd.trigger);
    sanitized.push(cmd);
  }

  const { config } = await loadConfig(session.tenantId);
  const nextConfig: Record<string, unknown> = { ...config };
  if (sanitized.length > 0) {
    nextConfig.customSlashCommands = sanitized;
  } else {
    delete nextConfig.customSlashCommands;
  }

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { whitelabelConfig: nextConfig as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, commands: sanitized });
}
