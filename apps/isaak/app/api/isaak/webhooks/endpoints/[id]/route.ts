// V1.8.3 — Borrar o activar/desactivar un webhook endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Context) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const result = await prisma.isaakWebhookEndpoint.deleteMany({
    where: { id, tenantId: session.tenantId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Context) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { active?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.active !== 'boolean') {
    return NextResponse.json(
      { error: 'invalid_payload', message: '`active` debe ser boolean.' },
      { status: 400 },
    );
  }

  const result = await prisma.isaakWebhookEndpoint.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { active: body.active },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, active: body.active });
}
