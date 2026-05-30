// V2.0.1 — Perfil fiscal por cliente del asesor.
//
// GET  /api/isaak/advisor/clients/[id]/fiscal-profile → { modelos: [...] }
// PUT  /api/isaak/advisor/clients/[id]/fiscal-profile  body { modelos }
//
// Persiste en Tenant.whitelabelConfig.advisorClientFiscalProfiles.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  ADVISOR_SELECTABLE_MODELOS,
  getClientFiscalProfile,
  setClientFiscalProfile,
} from '@/app/lib/isaak-advisor-fiscal';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function ensureOwnership(tenantId: string, clientId: string) {
  const existing = await prisma.advisorClient.findUnique({
    where: { id: clientId },
    select: { advisorTenantId: true },
  });
  return !!existing && existing.advisorTenantId === tenantId;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!(await ensureOwnership(session.tenantId, id))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const profile = await getClientFiscalProfile(session.tenantId, id);
  return NextResponse.json({
    modelos: profile?.modelos ?? [],
    available: ADVISOR_SELECTABLE_MODELOS,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!(await ensureOwnership(session.tenantId, id))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: { modelos?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!Array.isArray(body.modelos)) {
    return NextResponse.json({ error: 'modelos_required' }, { status: 400 });
  }
  const modelos = body.modelos.filter((m): m is string => typeof m === 'string');
  await setClientFiscalProfile(session.tenantId, id, modelos);

  const updated = await getClientFiscalProfile(session.tenantId, id);
  return NextResponse.json({ modelos: updated?.modelos ?? [] });
}
