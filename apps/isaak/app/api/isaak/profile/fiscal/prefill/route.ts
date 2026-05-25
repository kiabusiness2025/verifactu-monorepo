// I7 — Prefill del wizard R000 desde Company Intelligence.
//
// POST /api/isaak/profile/fiscal/prefill
//   body: { nif?: string, legalName?: string, province?: string }
//   → { suggestion: TaxpayerProfileInput, ciProfile: CompanyProfile }
//
// El cliente envía lo que tenga (típicamente solo el NIF del tenant);
// el endpoint llama a CompanyIntelligenceService.buildProfile(),
// traduce el resultado al shape del Inspector (mapCompanyProfileToTaxpayerInput)
// y devuelve ambos. La UI muestra al usuario qué dato vino de cada
// fuente y le pide confirmar.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { CompanyIntelligenceService } from '@/app/lib/company-intelligence-service';
import {
  BormeAdapter,
  GleifAdapter,
  PlacspAdapter,
  UserProvidedAdapter,
  ViesAdapter,
} from '@/app/lib/company-intelligence-sources';
import { mapCompanyProfileToTaxpayerInput } from '@/app/lib/isaak-taxpayer-profile';

export const runtime = 'nodejs';

async function requireSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { nif?: string; legalName?: string; province?: string };
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  // Si el cliente no envía NIF/nombre, intentamos rellenar desde
  // Tenant.nif / Tenant.legalName.
  let nif = body.nif?.trim();
  let legalName = body.legalName?.trim();
  if (!nif || !legalName) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { nif: true, legalName: true, name: true },
    });
    nif = nif || (tenant?.nif ?? undefined);
    legalName = legalName || (tenant?.legalName ?? tenant?.name ?? undefined);
  }

  if (!nif && !legalName) {
    return NextResponse.json(
      {
        error: 'no_input',
        message:
          'Se requiere al menos un NIF o un nombre legal para arrancar el prefill. Edita tu perfil de empresa primero o aporta el NIF.',
      },
      { status: 400 }
    );
  }

  try {
    const service = new CompanyIntelligenceService({
      adapters: [
        new UserProvidedAdapter(),
        new BormeAdapter(),
        new ViesAdapter(),
        new GleifAdapter(),
        new PlacspAdapter(),
      ],
    });
    const ciProfile = await service.buildProfile({
      nif,
      legalName,
      province: body.province,
    });

    const suggestion = mapCompanyProfileToTaxpayerInput({
      tenantId: session.tenantId,
      ci: {
        legalForm: ciProfile.identity.legalForm,
        taxResidence: ciProfile.identity.taxResidence,
        vatRegime: ciProfile.fiscal.likelyVatRegime,
        sector: undefined,
        // CI no expone corporateTaxSubject/intracom directamente como
        // booleans; los dejamos null y el wizard pregunta.
      },
    });

    return NextResponse.json({
      ok: true,
      suggestion,
      ciProfile,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'prefill_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
