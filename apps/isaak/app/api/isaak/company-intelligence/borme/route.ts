// V2.D.1 / V2.D.3 — Consulta BORME por NIF o nombre.
//
// GET /api/isaak/company-intelligence/borme?nif=XXX
// GET /api/isaak/company-intelligence/borme?name=YYY
//
// Auth: sesión válida (cualquier usuario logueado puede consultar; los
// datos son públicos del BOE).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  findBormeByCompanyName,
  findBormeByNif,
} from '@/app/lib/borme-scraper';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const nif = url.searchParams.get('nif')?.trim();
  const name = url.searchParams.get('name')?.trim();

  if (!nif && !name) {
    return NextResponse.json(
      { error: 'nif_or_name_required' },
      { status: 400 },
    );
  }

  const acts = nif
    ? await findBormeByNif(nif, 20)
    : await findBormeByCompanyName(name!, 20);

  return NextResponse.json({
    query: { nif: nif ?? null, name: name ?? null },
    count: acts.length,
    acts: acts.map((a) => ({
      id: a.id,
      bormeId: a.bormeId,
      publishedOn: a.publishedOn.toISOString().slice(0, 10),
      provinciaCode: a.provinciaCode,
      companyName: a.companyName,
      tipoActo: a.tipoActo,
      codigoActo: a.codigoActo,
      rawText: a.rawText,
    })),
  });
}
