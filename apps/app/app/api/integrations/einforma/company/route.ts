import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { getCompanyProfileByNif } from '@/server/einforma';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function withinDays(date: Date, days: number) {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() <= ms;
}

function safeString(value?: string | null) {
  return value ? value.trim().toUpperCase() : '';
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export async function GET(req: Request) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const limiter = rateLimit(req, {
      limit: 20,
      windowMs: 60_000,
      keyPrefix: 'einforma-integrations-company'
    });
    if (!limiter.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const taxId = (searchParams.get('taxId') ?? '').trim().toUpperCase();

    if (!taxId) {
      return NextResponse.json({ error: 'Falta taxId' }, { status: 400 });
    }

    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

    // Cache global por taxId (EinformaLookup)
    const lookup = await prisma.einformaLookup.findUnique({
      where: { queryType_queryValue: { queryType: 'TAX_ID', queryValue: taxId } },
      select: { raw: true, normalized: true, expiresAt: true, updatedAt: true },
    });

    if (lookup && lookup.expiresAt > new Date()) {
      return NextResponse.json({
        ok: true,
        profile: lookup.raw,
        normalized: lookup.normalized,
        cached: true,
        cacheSource: 'einformaLookup',
        lastSyncAt: lookup.updatedAt?.toISOString() ?? null,
      });
    }

    if (resolved.tenantId) {
      const tenantProfile = await prisma.tenantProfile.findUnique({
        where: { tenantId: resolved.tenantId },
        select: {
          sourceId: true,
          cnae: true,
          cnaeCode: true,
          cnaeText: true,
          legalForm: true,
          status: true,
          website: true,
          capitalSocial: true,
          incorporationDate: true,
          address: true,
          postalCode: true,
          city: true,
          province: true,
          country: true,
          einformaLastSyncAt: true,
          einformaTaxIdVerified: true,
          einformaRaw: true,
        },
      });

      if (
        tenantProfile?.einformaLastSyncAt &&
        tenantProfile.einformaTaxIdVerified &&
        withinDays(tenantProfile.einformaLastSyncAt, 30)
      ) {
        const raw = asRecord(tenantProfile.einformaRaw);
        const rawEmpresa = asRecord(raw.empresa);
        const rawNif = safeString(
          (typeof rawEmpresa.identificativo === 'string' ? rawEmpresa.identificativo : undefined) ??
            (typeof rawEmpresa.nif === 'string' ? rawEmpresa.nif : undefined) ??
            (typeof rawEmpresa.cif === 'string' ? rawEmpresa.cif : undefined) ??
            (typeof raw.nif === 'string' ? raw.nif : undefined) ??
            (typeof raw.cif === 'string' ? raw.cif : undefined)
        );
        const sourceId = safeString(tenantProfile.sourceId);
        if (rawNif === safeString(taxId) || sourceId === safeString(taxId)) {
          const profile = {
            name:
              (typeof rawEmpresa.denominacion === 'string' ? rawEmpresa.denominacion : undefined) ??
              (typeof raw.denominacion === 'string' ? raw.denominacion : undefined) ??
              '',
            legalName:
              (typeof rawEmpresa.razonSocial === 'string' ? rawEmpresa.razonSocial : undefined) ??
              (typeof raw.razonSocial === 'string' ? raw.razonSocial : undefined),
            tradeName:
              (typeof rawEmpresa.nombreComercial === 'string' ? rawEmpresa.nombreComercial : undefined) ??
              (typeof raw.nombreComercial === 'string' ? raw.nombreComercial : undefined),
            nif: rawNif || taxId,
            cnae:
              tenantProfile.cnae ??
              (typeof rawEmpresa.cnae === 'string' ? rawEmpresa.cnae : undefined) ??
              (typeof raw.cnae === 'string' ? raw.cnae : undefined),
            legalForm:
              tenantProfile.legalForm ??
              (typeof rawEmpresa.formaJuridica === 'string' ? rawEmpresa.formaJuridica : undefined) ??
              (typeof raw.formaJuridica === 'string' ? raw.formaJuridica : undefined),
            status:
              tenantProfile.status ??
              (typeof rawEmpresa.situacion === 'string' ? rawEmpresa.situacion : undefined) ??
              (typeof raw.situacion === 'string' ? raw.situacion : undefined),
            website:
              tenantProfile.website ??
              (typeof rawEmpresa.web === 'string' ? rawEmpresa.web : undefined) ??
              (typeof raw.web === 'string' ? raw.web : undefined),
            capitalSocial:
              tenantProfile.capitalSocial ??
              (typeof rawEmpresa.capitalSocial === 'number' ? rawEmpresa.capitalSocial : undefined) ??
              (typeof raw.capitalSocial === 'number' ? raw.capitalSocial : undefined),
            constitutionDate: tenantProfile.incorporationDate
              ? tenantProfile.incorporationDate.toISOString().slice(0, 10)
              : ((typeof rawEmpresa.fechaConstitucion === 'string'
                  ? rawEmpresa.fechaConstitucion
                  : undefined) ??
                (typeof raw.fechaConstitucion === 'string' ? raw.fechaConstitucion : undefined)),
            address: {
              street:
                tenantProfile.address ??
                (typeof rawEmpresa.domicilioSocial === 'string' ? rawEmpresa.domicilioSocial : undefined) ??
                (typeof raw.domicilioSocial === 'string' ? raw.domicilioSocial : undefined),
              zip:
                tenantProfile.postalCode ??
                (typeof rawEmpresa.cp === 'string' ? rawEmpresa.cp : undefined) ??
                (typeof raw.cp === 'string' ? raw.cp : undefined),
              city:
                tenantProfile.city ??
                (typeof rawEmpresa.localidad === 'string' ? rawEmpresa.localidad : undefined) ??
                (typeof raw.localidad === 'string' ? raw.localidad : undefined),
              province:
                tenantProfile.province ??
                (typeof rawEmpresa.provincia === 'string' ? rawEmpresa.provincia : undefined) ??
                (typeof raw.provincia === 'string' ? raw.provincia : undefined),
              country:
                tenantProfile.country ??
                (typeof rawEmpresa.country === 'string' ? rawEmpresa.country : undefined) ??
                (typeof raw.country === 'string' ? raw.country : undefined) ??
                'ES',
            },
            sourceId:
              tenantProfile.sourceId ??
              (typeof rawEmpresa.identificativo === 'string' ? rawEmpresa.identificativo : undefined) ??
              (typeof rawEmpresa.id === 'string' ? rawEmpresa.id : undefined) ??
              (typeof raw.id === 'string' ? raw.id : undefined),
            raw,
          };

          const cnaeParts = splitCnae(profile.cnae);
          return NextResponse.json({
            ok: true,
            profile,
            normalized: {
              name: profile.legalName || profile.name || null,
              nif: profile.nif || taxId,
              sourceId: profile.sourceId ?? profile.nif ?? null,
              cnae: profile.cnae ?? null,
              cnaeCode: tenantProfile.cnaeCode ?? cnaeParts.code ?? null,
              cnaeText: tenantProfile.cnaeText ?? cnaeParts.text ?? null,
              legalForm: profile.legalForm ?? null,
              status: profile.status ?? null,
              incorporationDate: profile.constitutionDate ?? null,
              address: profile.address?.street ?? null,
              postalCode: tenantProfile.postalCode ?? profile.address?.zip ?? null,
              city: tenantProfile.city ?? profile.address?.city ?? null,
              province: profile.address?.province ?? null,
              country: profile.address?.country ?? 'ES',
              website: profile.website ?? null,
              capitalSocial: profile.capitalSocial ?? null,
            },
            cached: true,
            cacheSource: 'tenantProfile',
            lastSyncAt: tenantProfile.einformaLastSyncAt?.toISOString() ?? null,
          });
        }
      }
    }

    const profile = await getCompanyProfileByNif(taxId);
    const cnaeParts = splitCnae(profile.cnae);
    const cityParts = normalizeCity(profile.address?.city);

    const normalized = {
      name: profile.legalName || profile.name || null,
      nif: profile.nif || taxId,
      sourceId: profile.sourceId ?? profile.nif ?? null,
      cnae: profile.cnae ?? null,
      cnaeCode: cnaeParts.code,
      cnaeText: cnaeParts.text,
      postalCode: cityParts.postalCode,
      city: cityParts.city,
      legalForm: profile.legalForm ?? null,
      status: profile.status ?? null,
      incorporationDate: profile.constitutionDate ?? null,
      address: profile.address?.street ?? null,
      province: profile.address?.province ?? null,
      country: profile.address?.country ?? 'ES',
      website: profile.website ?? null,
      capitalSocial: profile.capitalSocial ?? null,
    };

    const rawPayload = profile.raw ?? profile;
    const rawJson = JSON.parse(JSON.stringify(rawPayload));

    await prisma.einformaLookup.upsert({
      where: { queryType_queryValue: { queryType: 'TAX_ID', queryValue: taxId } },
      create: {
        queryType: 'TAX_ID',
        queryValue: taxId,
        raw: rawJson,
        normalized,
        expiresAt: addDays(30),
      },
      update: {
        raw: rawJson,
        normalized,
        expiresAt: addDays(30),
      },
    });

    return NextResponse.json({
      ok: true,
      profile,
      normalized,
      cached: false,
      cacheSource: 'einforma',
      lastSyncAt: null,
    });
  } catch (error) {
    console.error('eInforma company error:', error);
    return NextResponse.json({ error: 'No se pudo consultar eInforma' }, { status: 500 });
  }
}
