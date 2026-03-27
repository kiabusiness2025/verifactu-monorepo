import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

function normalizeName(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 2 ? trimmed : null;
}

function normalizeOptional(value: unknown, min = 2) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length >= min ? trimmed : null;
}

export async function GET() {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user, profile] = await Promise.all([
    session.userId
      ? prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve(null),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        representative: true,
        phone: true,
        tradeName: true,
        legalName: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    user,
    profile: {
      representative: profile?.representative ?? null,
      phone: profile?.phone ?? null,
      companyName: profile?.tradeName ?? profile?.legalName ?? null,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getHoldedSession();
  if (!session?.userId || !session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = normalizeName(body?.name);
  const phone = normalizeOptional(body?.phone, 6);
  const companyName = normalizeOptional(body?.companyName, 2);

  if (!name) {
    return NextResponse.json({ error: 'Escribe tu nombre para continuar.' }, { status: 400 });
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.tenantProfile.upsert({
      where: { tenantId: session.tenantId },
      update: {
        representative: name,
        phone: phone || undefined,
        tradeName: companyName || undefined,
      },
      create: {
        tenantId: session.tenantId,
        source: 'manual',
        representative: name,
        phone: phone || undefined,
        tradeName: companyName || undefined,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    user,
    profile: {
      representative: name,
      phone,
      companyName,
    },
  });
}
