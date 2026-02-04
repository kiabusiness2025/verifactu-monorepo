import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { getCompanyProfileByNif } from '@/server/einforma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  taxId?: string;
};

export async function POST(req: Request) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const taxId = typeof body?.taxId === 'string' ? body.taxId.trim().toUpperCase() : '';
    if (!taxId) {
      return NextResponse.json({ error: 'taxId requerido' }, { status: 400 });
    }

    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

    if (!resolved.tenantId) {
      return NextResponse.json({ error: 'Tenant no resuelto' }, { status: 400 });
    }

    const profile = await getCompanyProfileByNif(taxId);
    const verified = !!profile.nif && profile.nif.toUpperCase() === taxId;

    await prisma.tenantProfile.upsert({
      where: { tenantId: resolved.tenantId },
      create: {
        tenantId: resolved.tenantId,
        source: 'einforma',
        sourceId: profile.sourceId ?? taxId,
        cnae: profile.cnae || undefined,
        incorporationDate: profile.constitutionDate
          ? new Date(profile.constitutionDate)
          : undefined,
        address: profile.address?.street || undefined,
        city: profile.address?.city || undefined,
        province: profile.address?.province || undefined,
        representative: profile.representatives?.[0]?.name || undefined,
        einformaLastSyncAt: new Date(),
        einformaTaxIdVerified: verified,
        einformaRaw: profile.raw ?? undefined,
      },
      update: {
        source: 'einforma',
        sourceId: profile.sourceId ?? taxId,
        cnae: profile.cnae || undefined,
        incorporationDate: profile.constitutionDate
          ? new Date(profile.constitutionDate)
          : undefined,
        address: profile.address?.street || undefined,
        city: profile.address?.city || undefined,
        province: profile.address?.province || undefined,
        representative: profile.representatives?.[0]?.name || undefined,
        einformaLastSyncAt: new Date(),
        einformaTaxIdVerified: verified,
        einformaRaw: profile.raw ?? undefined,
      },
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error('eInforma enrich error:', error);
    return NextResponse.json({ error: 'No se pudo enriquecer el tenant' }, { status: 500 });
  }
}
