import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

function normalizeName(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 2 ? trimmed : null;
}

export async function PATCH(req: Request) {
  const session = await getHoldedSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = normalizeName(body?.name);

  if (!name) {
    return NextResponse.json({ error: 'Escribe tu nombre para continuar.' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user,
  });
}
