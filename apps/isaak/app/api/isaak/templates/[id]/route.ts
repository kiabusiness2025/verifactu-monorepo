import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const runtime = 'nodejs';

// PATCH — update (including set as default)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const existing = await prisma.invoiceTemplate.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.setAsDefault) {
    await prisma.invoiceTemplate.updateMany({
      where: { tenantId: session.tenantId },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.invoiceTemplate.update({
    where: { id },
    data: {
      name: typeof body.name === 'string' ? body.name : undefined,
      isDefault: body.setAsDefault ? true : undefined,
      primaryColor: typeof body.primaryColor === 'string' ? body.primaryColor : undefined,
      secondaryColor: typeof body.secondaryColor === 'string' ? body.secondaryColor : undefined,
      accentColor: typeof body.accentColor === 'string' ? body.accentColor : undefined,
      fontFamily: typeof body.fontFamily === 'string' ? body.fontFamily : undefined,
      logoUrl: isSafeHttpsUrl(body.logoUrl) ? body.logoUrl : undefined,
      layoutConfig:
        body.layoutConfig && typeof body.layoutConfig === 'object'
          ? (body.layoutConfig as import('@prisma/client').Prisma.InputJsonValue)
          : undefined,
    },
  });

  return NextResponse.json({ ok: true, template: updated });
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const existing = await prisma.invoiceTemplate.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

  await prisma.invoiceTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
