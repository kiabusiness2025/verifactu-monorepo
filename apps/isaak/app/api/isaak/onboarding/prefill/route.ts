// V2.D.3 — Endpoint de prefill del perfil al onboarding.
//
// GET /api/isaak/onboarding/prefill?nif=XXX&name=YYY
//
// Combina BORME + VIES y devuelve datos derivados listos para volcar
// al formulario de onboarding o pre-rellenar TenantProfile.
//
// Auth: usuario logueado (los datos son públicos).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prefillFromPublicSources } from '@/app/lib/company-prefill';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const nif = url.searchParams.get('nif')?.trim() || undefined;
  const name = url.searchParams.get('name')?.trim() || undefined;

  if (!nif && !name) {
    return NextResponse.json(
      { error: 'nif_or_name_required' },
      { status: 400 },
    );
  }

  const result = await prefillFromPublicSources({ nif, companyName: name });
  return NextResponse.json({
    query: { nif: nif ?? null, name: name ?? null },
    ...result,
  });
}
