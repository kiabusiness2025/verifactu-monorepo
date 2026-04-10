import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import {
  getTenantProfileColumnAvailability,
  isMissingTenantProfileColumnError,
  LEGACY_TENANT_PROFILE_COLUMN_AVAILABILITY,
  resetTenantProfileColumnAvailabilityCache,
  type TenantProfileColumnAvailability,
} from '@/lib/tenantProfileSchema';
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

function buildEinformaTenantProfileData(input: {
  availability: TenantProfileColumnAvailability;
  taxId: string;
  verified: boolean;
  profile: Awaited<ReturnType<typeof getCompanyProfileByNif>>;
  cnaeParts: ReturnType<typeof splitCnae>;
  cityParts: ReturnType<typeof normalizeCity>;
}) {
  const { availability, taxId, verified, profile, cnaeParts, cityParts } = input;

  return {
    source: 'einforma',
    sourceId: profile.sourceId ?? taxId,
    taxId,
    legalName: profile.legalName || profile.name || undefined,
    tradeName: profile.name || profile.legalName || undefined,
    fiscalAddress: profile.address
      ? {
          address: profile.address.street ?? null,
          city: cityParts.city ?? null,
          postalCode: cityParts.postalCode ?? null,
          province: profile.address.province ?? null,
          country: profile.address.country ?? 'ES',
        }
      : undefined,
    defaultCurrency: 'EUR',
    cnae: profile.cnae || undefined,
    ...(availability.cnaeCode ? { cnaeCode: cnaeParts.code } : {}),
    ...(availability.cnaeText ? { cnaeText: cnaeParts.text } : {}),
    ...(availability.legalForm ? { legalForm: profile.legalForm || undefined } : {}),
    ...(availability.status ? { status: profile.status || undefined } : {}),
    ...(availability.website ? { website: profile.website || undefined } : {}),
    ...(availability.capitalSocial ? { capitalSocial: profile.capitalSocial ?? undefined } : {}),
    incorporationDate: profile.constitutionDate ? new Date(profile.constitutionDate) : undefined,
    address: profile.address?.street || undefined,
    ...(availability.postalCode ? { postalCode: cityParts.postalCode } : {}),
    city: cityParts.city || undefined,
    province: profile.address?.province || undefined,
    ...(availability.country ? { country: profile.address?.country || undefined } : {}),
    representative: profile.representatives?.[0]?.name || undefined,
    ...(availability.einformaLastSyncAt ? { einformaLastSyncAt: new Date() } : {}),
    ...(availability.einformaTaxIdVerified ? { einformaTaxIdVerified: verified } : {}),
    ...(availability.einformaRaw ? { einformaRaw: profile.raw ?? undefined } : {}),
  };
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

    const tenantId = resolved.tenantId;

    const profile = await getCompanyProfileByNif(taxId);
    const verified = !!profile.nif && profile.nif.toUpperCase() === taxId;
    const cnaeParts = splitCnae(profile.cnae);
    const cityParts = normalizeCity(profile.address?.city);

    const tenantProfileColumns = await getTenantProfileColumnAvailability();
    const upsertTenantProfile = async (availability: TenantProfileColumnAvailability) => {
      const tenantProfileData = buildEinformaTenantProfileData({
        availability,
        taxId,
        verified,
        profile,
        cnaeParts,
        cityParts,
      });

      await prisma.tenantProfile.upsert({
        where: { tenantId },
        create: {
          tenantId,
          ...tenantProfileData,
        } as never,
        update: tenantProfileData as never,
        select: { tenantId: true },
      });
    };

    try {
      await upsertTenantProfile(tenantProfileColumns);
    } catch (error) {
      if (!isMissingTenantProfileColumnError(error)) {
        throw error;
      }

      resetTenantProfileColumnAvailabilityCache();
      await upsertTenantProfile(LEGACY_TENANT_PROFILE_COLUMN_AVAILABILITY);
    }

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
