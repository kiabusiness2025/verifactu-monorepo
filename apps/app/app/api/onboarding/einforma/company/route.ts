import { NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { getCompanyProfileByNif, type EinformaCompanyProfile } from '@/server/einforma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    return NextResponse.json({
      ok: true,
      company: {
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
      },
    });
  } catch (error) {
    console.error('eInforma company error:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo obtener los datos de la empresa' },
      { status: 502 }
    );
  }
}
