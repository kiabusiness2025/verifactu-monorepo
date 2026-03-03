import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { getCompanyProfileByNif, type EinformaCompanyProfile } from '@/server/einforma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function isProfileLike(value: unknown): value is EinformaCompanyProfile {
  return typeof asRecord(value).name === 'string';
}

function toCompanyPayload(sourceId: string, profile: EinformaCompanyProfile) {
  return {
    einformaId: sourceId,
    name: profile.name,
    legalName: profile.legalName ?? profile.name,
    nif: profile.nif ?? '',
    cnae: profile.cnae ?? '',
    legalForm: profile.legalForm ?? '',
    status: profile.status ?? '',
    website: profile.website ?? '',
    capitalSocial: profile.capitalSocial ?? null,
    incorporationDate: profile.constitutionDate ?? null,
    lastBalanceDate: profile.lastBalanceDate ?? null,
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    employees: profile.employees ?? null,
    sales: profile.sales ?? null,
    salesYear: profile.salesYear ?? null,
    address: profile.address?.street ?? '',
    city: profile.address?.city ?? '',
    postalCode: profile.address?.zip ?? '',
    province: profile.address?.province ?? '',
    country: profile.address?.country ?? 'ES',
    representative: profile.representatives?.[0]?.name ?? '',
    raw: profile.raw ?? null,
  };
}

export async function GET(req: Request) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const limiter = rateLimit(req, {
    limit: 20,
    windowMs: 60_000,
    keyPrefix: 'einforma-onboarding-company',
  });
  if (!limiter.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const einformaId = searchParams.get('einformaId')?.trim();
  const taxId = searchParams.get('taxId')?.trim().toUpperCase();

  if (!einformaId && !taxId) {
    return NextResponse.json({ ok: false, error: 'einformaId o taxId requerido' }, { status: 400 });
  }

  try {
    // Primero consultar cache local para evitar consumo de creditos.
    if (taxId) {
      const lookup = await prisma.einformaLookup.findUnique({
        where: {
          queryType_queryValue: {
            queryType: 'TAX_ID',
            queryValue: taxId,
          },
        },
        select: {
          normalized: true,
          updatedAt: true,
          expiresAt: true,
        },
      });

      if (lookup && lookup.expiresAt > new Date() && isProfileLike(lookup.normalized)) {
        return NextResponse.json(
          {
            ok: true,
            company: toCompanyPayload(taxId, lookup.normalized),
            cached: true,
            cacheSource: 'einformaLookup',
            lastSyncAt: lookup.updatedAt?.toISOString() ?? null,
          },
          { headers: { 'X-Einforma-Source': 'cache' } }
        );
      }
    }

    const candidates = [taxId, einformaId].filter((value): value is string => Boolean(value));
    let profile: EinformaCompanyProfile | null = null;
    let sourceId = candidates[0] ?? '';

    for (const candidate of candidates) {
      try {
        profile = await getCompanyProfileByNif(candidate);
        sourceId = candidate;
        break;
      } catch {
        // Probar siguiente candidato
      }
    }

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo resolver la empresa en eInforma' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        company: toCompanyPayload(sourceId, profile),
        cached: false,
        cacheSource: 'einforma',
        lastSyncAt: null,
      },
      { headers: { 'X-Einforma-Source': 'live' } }
    );
  } catch (error) {
    console.error('eInforma company error:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo obtener los datos de la empresa' },
      { status: 502 }
    );
  }
}
