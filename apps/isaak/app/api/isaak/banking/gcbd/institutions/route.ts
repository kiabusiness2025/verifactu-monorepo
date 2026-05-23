/**
 * GET /api/isaak/banking/gcbd/institutions?country=ES
 *
 * Returns the list of available banks for the given country code.
 * Defaults to Spain (ES). Used to let the user pick their bank before connecting.
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { listInstitutions } from '@verifactu/integrations/gocardless-bank-data';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const country = new URL(request.url).searchParams.get('country') ?? 'ES';

  try {
    const institutions = await listInstitutions(country);
    return NextResponse.json({ institutions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
