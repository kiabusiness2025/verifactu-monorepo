// C-B7+ — Exporta el borrador 180 como fichero .180 BOE (anual).
//
// Diseño de registro codificado MANUALMENTE desde DR_Mod_180_2023.pdf
// (AEAT). OCA/l10n-spain no incluye este módulo.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { compute180ForTenant } from '@/app/lib/isaak-modelo-180-repo';
import { serialize180, type Modelo180Context } from '@/app/lib/aeat-formats/180/serializer';
import { aeatFilename } from '@/app/lib/aeat-formats/common';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { ejercicio?: number };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const ejercicio = typeof body.ejercicio === 'number' ? body.ejercicio : NaN;
  if (!Number.isFinite(ejercicio) || ejercicio < 2020 || ejercicio > 2100) {
    return NextResponse.json({ error: 'invalid_ejercicio' }, { status: 400 });
  }

  const computed = await compute180ForTenant({
    tenantId: session.tenantId,
    ejercicio,
    persist: false,
  });
  if (!computed.ok) {
    return NextResponse.json(
      { error: 'compute_failed', message: computed.error },
      { status: 500 },
    );
  }
  if (computed.output.skipped) {
    return NextResponse.json(
      { error: 'compute_skipped', reason: computed.output.reason },
      { status: 404 },
    );
  }

  const { prisma } = await import('@/app/lib/prisma');
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, nif: true, legalName: true },
  });
  if (!tenant?.nif) {
    return NextResponse.json({ error: 'tenant_missing_nif' }, { status: 400 });
  }

  const ctx: Modelo180Context = {
    companyVat: tenant.nif,
    companyName: tenant.legalName ?? tenant.name ?? '',
  };
  const out = serialize180(computed.output.result, ctx);
  if (!out.ok) {
    return NextResponse.json(
      { error: 'serialize_failed', message: out.error },
      { status: 500 },
    );
  }

  const fname = aeatFilename(tenant.nif, '180', ejercicio, 'A');
  return new NextResponse(out.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Content-Length': String(out.bytes.length),
      'X-AEAT-Format': 'BOE-180-2023',
    },
  });
}
