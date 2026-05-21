import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  generateModelo303,
  generateModelo390,
  generateModelo130,
  type Trimestre,
} from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';

type ModeloRequest =
  | { modelo: '303'; ejercicio: number; periodo: Trimestre }
  | {
      modelo: '130';
      ejercicio: number;
      periodo: Trimestre;
      retencionesAcumuladas?: number;
      ingresosACuenta?: number;
    }
  | { modelo: '390'; ejercicio: number };

export async function POST(req: NextRequest) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Business plan only — join with Plan to check code
  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId: session.tenantId },
    include: { plan: { select: { code: true } } },
  });
  const planCode = sub?.plan?.code?.toLowerCase() ?? '';
  if (!planCode.includes('business') && !planCode.includes('enterprise')) {
    return NextResponse.json(
      { error: 'plan_required', message: 'Los modelos AEAT requieren el plan Business.' },
      { status: 403 }
    );
  }

  let body: ModeloRequest;
  try {
    body = (await req.json()) as ModeloRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.modelo || !body.ejercicio) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const ejercicio = Number(body.ejercicio);
  if (ejercicio < 2020 || ejercicio > new Date().getFullYear() + 1) {
    return NextResponse.json({ error: 'invalid_ejercicio' }, { status: 400 });
  }

  try {
    if (body.modelo === '303') {
      const data = await generateModelo303(session.tenantId, ejercicio, body.periodo);
      return NextResponse.json({ ok: true, data });
    }

    if (body.modelo === '130') {
      const data = await generateModelo130(session.tenantId, ejercicio, body.periodo, {
        retencionesAcumuladas: body.retencionesAcumuladas,
        ingresosACuenta: body.ingresosACuenta,
      });
      return NextResponse.json({ ok: true, data });
    }

    if (body.modelo === '390') {
      const data = await generateModelo390(session.tenantId, ejercicio);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ error: 'unknown_modelo' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando modelo';
    return NextResponse.json({ error: 'generation_failed', message }, { status: 500 });
  }
}
