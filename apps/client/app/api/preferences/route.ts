import { prisma } from '@verifactu/db';
import { isValidIsaakTone, normalizeIsaakTone, type IsaakTone } from '@verifactu/utils/isaak/persona';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const directUserId =
    request.headers.get('x-vf-user-id') || request.nextUrl.searchParams.get('userId');
  if (directUserId) return directUserId;

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return null;

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      status: 'active',
      role: 'OWNER',
    },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });

  return membership?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);

    if (!userId) {
      return NextResponse.json({ ok: true, isaak_tone: normalizeIsaakTone(), persisted: false });
    }

    await prisma.userPreference.findUnique({
      where: { userId },
      select: { userId: true },
    });

    return NextResponse.json({
      ok: true,
      isaak_tone: normalizeIsaakTone(),
      persisted: false,
    });
  } catch (error) {
    console.error('[client/preferences] GET error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar la personalidad de Isaak' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const nextTone = body?.isaak_tone;

    if (typeof nextTone !== 'string' || !isValidIsaakTone(nextTone)) {
      return NextResponse.json(
        { ok: false, error: 'isaak_tone debe ser friendly | professional | minimal' },
        { status: 400 }
      );
    }

    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ ok: true, isaak_tone: nextTone, persisted: false });
    }

    // Tone persistence was removed from the Prisma UserPreference model.
    // Keep the endpoint contract stable and let the client handle local tone preference.
    return NextResponse.json({ ok: true, isaak_tone: nextTone, persisted: false });
  } catch (error) {
    console.error('[client/preferences] PATCH error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar la personalidad de Isaak' },
      { status: 500 }
    );
  }
}
