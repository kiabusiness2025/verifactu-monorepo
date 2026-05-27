// C-B6+ — Exporta el borrador 115 como fichero .115 BOE.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { compute115ForTenant } from '@/app/lib/isaak-modelo-115-repo';
import { serialize115, type Modelo115Context } from '@/app/lib/aeat-formats/115/serializer';
import { aeatFilename } from '@/app/lib/aeat-formats/common';
import type { Trimestre } from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';

const VALID_TRIMS = new Set(['1T', '2T', '3T', '4T']);

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { ejercicio?: number; periodo?: string };
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

  const computed = await compute115ForTenant({
    tenantId: session.tenantId,
    ejercicio,
    periodo: periodo as Trimestre,
    persist: false,
  });
  if (!computed.ok) {
    return NextResponse.json({ error: 'compute_failed', message: computed.error }, { status: 500 });
  }
  if (computed.output.skipped) {
    return NextResponse.json({ error: 'compute_skipped', reason: computed.output.reason }, { status: 404 });
  }

  const { prisma } = await import('@/app/lib/prisma');
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, nif: true, legalName: true },
  });
  if (!tenant?.nif) {
    return NextResponse.json({ error: 'tenant_missing_nif' }, { status: 400 });
  }

  const ctx: Modelo115Context = {
    companyVat: tenant.nif,
    companyName: tenant.legalName ?? tenant.name ?? '',
    programVersion: 'ISAK',
  };
  const out = serialize115(computed.output.result, ctx);
  if (!out.ok) {
    return NextResponse.json({ error: 'serialize_failed', message: out.error }, { status: 500 });
  }

  const fname = aeatFilename(tenant.nif, '115', ejercicio, periodo);
  return new NextResponse(out.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Content-Length': String(out.bytes.length),
      'X-AEAT-Format': 'BOE-115',
    },
  });
}
