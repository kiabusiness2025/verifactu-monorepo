import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

function isSafeImageUrl(value: string) {
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value)) {
    return value.length <= 2_800_000;
  }
  try {
    const { protocol, hostname } = new URL(value);
    if (protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(hostname))
      return false;
    return true;
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
