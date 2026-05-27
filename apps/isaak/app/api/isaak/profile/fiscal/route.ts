// I7 R000 — Endpoint del perfil fiscal del contribuyente.
//
// GET /api/isaak/profile/fiscal → { profile, completeness, gaps }
// POST body: TaxpayerProfileInput → upsert + devuelve perfil
//
// tenantId siempre desde sesión.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  getTaxpayerProfile,
  upsertTaxpayerProfile,
  type TaxpayerProfileInput,
} from '@/app/lib/isaak-taxpayer-profile';
import { evaluateProfile } from '@/app/lib/inspector-aeat-profile';

export const runtime = 'nodejs';

async function requireSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return null;
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const profile = await getTaxpayerProfile(session.tenantId);
  // evaluateProfile acepta TaxpayerProfileSnapshot (null si no existe)
  const snapshot = profile
    ? {
        taxpayerType: profile.taxpayerType,
        territory: profile.territory,
        vatRegime: profile.vatRegime,
        sector: profile.sector,
        corporateTaxSubject: profile.corporateTaxSubject,
        hasEmployees: profile.hasEmployees,
        hasRentWithholding: profile.hasRentWithholding,
        hasProfessionalInvoices: profile.hasProfessionalInvoices,
        hasIntraEUOperations: profile.hasIntraEUOperations,
        hasRelatedParties: profile.hasRelatedParties,
        usesBillingSoftware: profile.usesBillingSoftware,
        annualTurnover: profile.annualTurnover ? Number.parseFloat(profile.annualTurnover) : null,
      }
    : null;
  const report = evaluateProfile(snapshot);
  return NextResponse.json({ profile, completeness: report.completeness, gaps: report.gaps });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Partial<TaxpayerProfileInput>;
  try {
    body = (await req.json()) as Partial<TaxpayerProfileInput>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  try {
    const result = await upsertTaxpayerProfile({
      ...body,
      tenantId: session.tenantId,
      confirmedBy: session.userId ?? null,
    } as TaxpayerProfileInput);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_input', message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}
