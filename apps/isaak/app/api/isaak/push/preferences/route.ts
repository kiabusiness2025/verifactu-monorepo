import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const prefs = await prisma.isaakPushPreferences.findUnique({
    where: {
      tenantId_userId: { tenantId: session.tenantId, userId: session.userId },
    },
    select: {
      alertaFiscal: true,
      documentoSinConciliar: true,
      avisoProactivoIsaak: true,
    },
  });

  return NextResponse.json({
    alertaFiscal: prefs?.alertaFiscal ?? true,
    documentoSinConciliar: prefs?.documentoSinConciliar ?? true,
    avisoProactivoIsaak: prefs?.avisoProactivoIsaak ?? true,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const data: Partial<{
    alertaFiscal: boolean;
    documentoSinConciliar: boolean;
    avisoProactivoIsaak: boolean;
  }> = {};

  if (typeof body.alertaFiscal === 'boolean') data.alertaFiscal = body.alertaFiscal;
  if (typeof body.documentoSinConciliar === 'boolean')
    data.documentoSinConciliar = body.documentoSinConciliar;
  if (typeof body.avisoProactivoIsaak === 'boolean')
    data.avisoProactivoIsaak = body.avisoProactivoIsaak;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin cambios que guardar.' }, { status: 400 });
  }

  const prefs = await prisma.isaakPushPreferences.upsert({
    where: {
      tenantId_userId: { tenantId: session.tenantId, userId: session.userId },
    },
    create: {
      tenantId: session.tenantId,
      userId: session.userId,
      alertaFiscal: data.alertaFiscal ?? true,
      documentoSinConciliar: data.documentoSinConciliar ?? true,
      avisoProactivoIsaak: data.avisoProactivoIsaak ?? true,
    },
    update: data,
    select: {
      alertaFiscal: true,
      documentoSinConciliar: true,
      avisoProactivoIsaak: true,
    },
  });

  return NextResponse.json({ ok: true, data: prefs });
}
