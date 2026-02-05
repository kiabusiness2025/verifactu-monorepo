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

function splitCnae(value?: string) {
  if (!value) return { code: undefined, text: undefined };
  const parts = value
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { code: undefined, text: undefined };
  if (parts.length === 1) return { code: parts[0], text: undefined };
  return { code: parts[0], text: parts.slice(1).join(' - ') };
}

function normalizeCity(value?: string) {
  if (!value) return { postalCode: undefined, city: undefined };
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{5})\s+([^()]+)(?:\s*\(.*\))?$/);
  if (match) {
    return { postalCode: match[1], city: match[2].trim() };
  }
  return { postalCode: undefined, city: trimmed.split('(')[0]?.trim() || trimmed };
}

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
    const cnaeParts = splitCnae(profile.cnae);
    const cityParts = normalizeCity(profile.address?.city);

    await prisma.tenantProfile.upsert({
      where: { tenantId: resolved.tenantId },
      create: {
        tenantId: resolved.tenantId,
        source: 'einforma',
        sourceId: profile.sourceId ?? taxId,
        cnae: profile.cnae || undefined,
        cnaeCode: cnaeParts.code,
        cnaeText: cnaeParts.text,
        legalForm: profile.legalForm || undefined,
        status: profile.status || undefined,
        website: profile.website || undefined,
        capitalSocial: profile.capitalSocial ?? undefined,
        incorporationDate: profile.constitutionDate
          ? new Date(profile.constitutionDate)
          : undefined,
        address: profile.address?.street || undefined,
        postalCode: cityParts.postalCode,
        city: cityParts.city || undefined,
        province: profile.address?.province || undefined,
        country: profile.address?.country || undefined,
        representative: profile.representatives?.[0]?.name || undefined,
        einformaLastSyncAt: new Date(),
        einformaTaxIdVerified: verified,
        einformaRaw: profile.raw ?? undefined,
      },
      update: {
        source: 'einforma',
        sourceId: profile.sourceId ?? taxId,
        cnae: profile.cnae || undefined,
        cnaeCode: cnaeParts.code,
        cnaeText: cnaeParts.text,
        legalForm: profile.legalForm || undefined,
        status: profile.status || undefined,
        website: profile.website || undefined,
        capitalSocial: profile.capitalSocial ?? undefined,
        incorporationDate: profile.constitutionDate
          ? new Date(profile.constitutionDate)
          : undefined,
        address: profile.address?.street || undefined,
        postalCode: cityParts.postalCode,
        city: cityParts.city || undefined,
        province: profile.address?.province || undefined,
        country: profile.address?.country || undefined,
        representative: profile.representatives?.[0]?.name || undefined,
        einformaLastSyncAt: new Date(),
        einformaTaxIdVerified: verified,
        einformaRaw: profile.raw ?? undefined,
      },
    });

    const normalized = {
      name: profile.name ?? null,
      nif: profile.nif ?? null,
      sourceId: profile.sourceId ?? profile.nif ?? null,
      cnae: profile.cnae ?? null,
      cnaeCode: cnaeParts.code ?? null,
      cnaeText: cnaeParts.text ?? null,
      legalForm: profile.legalForm ?? null,
      status: profile.status ?? null,
      incorporationDate: profile.constitutionDate
        ? new Date(profile.constitutionDate).toISOString()
        : null,
      address: profile.address?.street ?? null,
      postalCode: cityParts.postalCode ?? null,
      city: cityParts.city ?? null,
      province: profile.address?.province ?? null,
      country: profile.address?.country ?? 'ES',
      website: profile.website ?? null,
      capitalSocial: profile.capitalSocial ?? null,
    };

    return NextResponse.json({ ok: true, profile, normalized });
  } catch (error) {
    console.error('eInforma enrich error:', error);
    return NextResponse.json({ error: 'No se pudo enriquecer el tenant' }, { status: 500 });
  }
}
