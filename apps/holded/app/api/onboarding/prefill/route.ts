// V2.D.3 — Prefill desde fuentes públicas para el onboarding Holded.
//
// GET /api/onboarding/prefill?nif=XXX&name=YYY
//
// Auth: sesión válida de Holded.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { prefillFromPublicSources } from '@verifactu/integrations';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.userId) {
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

  const result = await prefillFromPublicSources(prisma, { nif, companyName: name });
  return NextResponse.json({ query: { nif: nif ?? null, name: name ?? null }, ...result });
}
