// V2.D.3 — Prefill desde fuentes públicas (BORME + VIES) para
// onboarding ChatGPT MCP.
//
// GET /api/onboarding/public-prefill?nif=XXX&name=YYY
//
// Complementa /api/onboarding/prefill (que lee del propio TenantProfile
// y de identidades recordadas) con datos públicos del Registro
// Mercantil. No requiere identidad — devuelve solo datos públicos.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { prefillFromPublicSources } from '@verifactu/integrations';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nif = url.searchParams.get('nif')?.trim() || undefined;
  const name = url.searchParams.get('name')?.trim() || undefined;

  if (!nif && !name) {
    return NextResponse.json(
      { error: 'nif_or_name_required' },
      { status: 400 },
    );
  }

  const result = await prefillFromPublicSources(prisma, { nif, companyName: name });
  return NextResponse.json({ query: { nif: nif ?? null, name: name ?? null }, ...result });
}
