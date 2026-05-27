/**
 * GET  /api/admin/tenants/[id]/integrations — lista integraciones OAuth + bancarias + cert AEAT
 * POST /api/admin/tenants/[id]/integrations — acción de revocación { action:'revoke', type, id }
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request, { params }: RouteContext) {
  await requireAdmin(req);
  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const [google, microsoft, banking, certificate] = await Promise.all([
    prisma.isaakGoogleToken.findMany({
      where: { tenantId },
      select: {
        id: true,
        userId: true,
        email: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.isaakMicrosoftToken.findMany({
      where: { tenantId },
      select: {
        id: true,
        userId: true,
        email: true,
        displayName: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.seConnection.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        providerCode: true,
        providerName: true,
        countryCode: true,
        status: true,
        lastSyncAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { accounts: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenantCertificate.findFirst({
      where: { tenantId },
      select: {
        id: true,
        certType: true,
        nif: true,
        commonName: true,
        issuer: true,
        validFrom: true,
        validTo: true,
        createdAt: true,
      },
      orderBy: { validTo: 'desc' },
    }),
  ]);

  return NextResponse.json({
    google: google.map((t) => ({
      id: t.id,
      userId: t.userId,
      email: t.email,
      scopes: t.scopes,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
    microsoft: microsoft.map((t) => ({
      id: t.id,
      userId: t.userId,
      email: t.email,
      displayName: t.displayName,
      scopes: t.scopes,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
    banking: banking.map((c) => ({
      id: c.id,
      provider: c.provider,
      providerCode: c.providerCode,
      providerName: c.providerName,
      countryCode: c.countryCode,
      status: c.status,
      lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      accountCount: c._count.accounts,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    certificate: certificate
      ? {
          id: certificate.id,
          certType: certificate.certType,
          nif: certificate.nif,
          commonName: certificate.commonName,
          issuer: certificate.issuer,
          validFrom: certificate.validFrom.toISOString(),
          validTo: certificate.validTo.toISOString(),
          createdAt: certificate.createdAt.toISOString(),
        }
      : null,
  });
}

// ── POST: revoke action ───────────────────────────────────────────────────────

export async function POST(req: Request, { params }: RouteContext) {
  await requireAdmin(req);
  const { id: tenantId } = await params;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : null;
  const type = typeof body.type === 'string' ? body.type : null;
  const id = typeof body.id === 'string' ? body.id : null;

  if (action !== 'revoke' || !type || !id) {
    return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
  }

  if (type === 'google') {
    const token = await prisma.isaakGoogleToken.findFirst({ where: { id, tenantId } });
    if (!token) return NextResponse.json({ error: 'Token no encontrado.' }, { status: 404 });
    await prisma.isaakGoogleToken.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (type === 'microsoft') {
    const token = await prisma.isaakMicrosoftToken.findFirst({ where: { id, tenantId } });
    if (!token) return NextResponse.json({ error: 'Token no encontrado.' }, { status: 404 });
    await prisma.isaakMicrosoftToken.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (type === 'banking') {
    const conn = await prisma.seConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Conexión no encontrada.' }, { status: 404 });
    await prisma.seConnection.update({ where: { id }, data: { status: 'disabled' } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Tipo no válido.' }, { status: 400 });
}
