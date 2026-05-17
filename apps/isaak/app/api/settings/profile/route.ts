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

/** Normaliza a E.164: elimina espacios/guiones, añade "+" si falta */
function normalizeE164(value: string): string {
  const digits = value.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return `+${digits}`;
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
  const rawPhone = normalizeText(body.phone, 5);
  const phone = rawPhone ? normalizeE164(rawPhone) : null;

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
