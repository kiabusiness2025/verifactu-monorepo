// C-B1.b+ — Exporta el borrador 303 como fichero .303 BOE (ISO-8859-15).
//
// POST /api/isaak/modelos/303/export
//   { ejercicio, periodo, companyName?, devolucionMensual?, ... }
//   → 200 application/octet-stream con el fichero .303
//   → 400/404 si no se puede computar o falta el draft
//
// El servicio AEAT "Presentación por fichero" acepta este formato.
// IMPORTANTE: este endpoint NO presenta a AEAT, solo genera el fichero
// para que el usuario lo suba manualmente al portal AEAT (o, en C-B1.c,
// lo enviemos por SOAP automáticamente).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { compute303ForTenant } from '@/app/lib/isaak-modelo-303-repo';
import {
  filename303,
  serialize303,
  type Modelo303Context,
} from '@/app/lib/aeat-formats/303/serializer';
import type { Trimestre } from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';

const VALID_TRIMS = new Set(['1T', '2T', '3T', '4T']);

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    ejercicio?: number;
    periodo?: string;
    companyName?: string;
    devolucionMensual?: boolean;
    isVoluntarySii?: boolean;
    exonerated390?: boolean;
    iban?: string;
  };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const ejercicio = typeof body.ejercicio === 'number' ? body.ejercicio : NaN;
  if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
    return NextResponse.json({ error: 'invalid_ejercicio' }, { status: 400 });
  }
  const periodo = String(body.periodo ?? '').toUpperCase();
  if (!VALID_TRIMS.has(periodo)) {
    return NextResponse.json({ error: 'invalid_periodo' }, { status: 400 });
  }

  // 1. Computar borrador desde el Ledger
  const computed = await compute303ForTenant({
    tenantId: session.tenantId,
    ejercicio,
    periodo: periodo as Trimestre,
    persist: false,
  });
  if (!computed.ok) {
    return NextResponse.json(
      { error: 'compute_failed', message: computed.error ?? 'No se pudo computar el 303.' },
      { status: 500 },
    );
  }
  if (computed.output.skipped) {
    return NextResponse.json(
      { error: 'compute_skipped', reason: computed.output.reason },
      { status: 404 },
    );
  }

  // 2. Cargar datos del declarante desde el perfil del tenant
  const { prisma } = await import('@/app/lib/prisma');
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, nif: true, legalName: true },
  });
  if (!tenant || !tenant.nif) {
    return NextResponse.json(
      { error: 'tenant_missing_nif', message: 'El tenant no tiene NIF configurado.' },
      { status: 400 },
    );
  }

  const ctx: Modelo303Context = {
    companyVat: tenant.nif,
    companyName: body.companyName ?? tenant.legalName ?? tenant.name ?? '',
    devolucionMensual: body.devolucionMensual,
    isVoluntarySii: body.isVoluntarySii,
    exonerated390: body.exonerated390,
    iban: body.iban,
    programVersion: 'ISAK',
  };

  // 3. Serializar a BOE TXT
  const serialized = serialize303(computed.output.result, ctx);
  if (!serialized.ok) {
    return NextResponse.json(
      { error: 'serialize_failed', message: serialized.error },
      { status: 500 },
    );
  }

  // 4. Devolver como descarga
  const fname = filename303(tenant.nif, ejercicio, periodo);
  return new NextResponse(serialized.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Content-Length': String(serialized.bytes.length),
      'X-AEAT-Format': 'BOE-303-2024-10',
    },
  });
}
