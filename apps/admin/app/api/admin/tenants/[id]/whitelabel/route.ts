import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { whitelabelConfig: true },
  });

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  return NextResponse.json({ config: tenant.whitelabelConfig ?? null });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id } = await params;

  const body = (await req.json()) as Record<string, unknown>;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { whitelabelConfig: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const current = (tenant.whitelabelConfig ?? {}) as Record<string, unknown>;
  const updated = { ...current, ...body };

  await prisma.tenant.update({
    where: { id },
    data: { whitelabelConfig: updated as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, config: updated });
}
