import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

function isSafeImageUrl(value: string) {
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl.trim() : '';

  if (!photoUrl || !isSafeImageUrl(photoUrl)) {
    return NextResponse.json(
      { error: 'Sube una URL de imagen valida para actualizar el avatar.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { image: photoUrl },
    select: { image: true },
  });

  return NextResponse.json({
    ok: true,
    data: {
      photoUrl: user.image,
    },
  });
}
