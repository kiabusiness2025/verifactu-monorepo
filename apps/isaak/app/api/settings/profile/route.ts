import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function normalizeText(value: unknown, min = 1) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length >= min ? normalized : null;
}

async function requireSession() {
  return toSettingsSession(await getHoldedSession());
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.profile });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const firstName = normalizeText(body.firstName, 2);
  const phone = normalizeText(body.phone, 5);

  if (!firstName) {
    return NextResponse.json(
      { error: 'Escribe tu nombre de pila para continuar.' },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: firstName,
      phone: phone || null,
    },
  });

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.profile });
}
