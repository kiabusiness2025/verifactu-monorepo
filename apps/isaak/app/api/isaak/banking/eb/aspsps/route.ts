/**
 * GET /api/isaak/banking/eb/aspsps?country=ES
 *
 * Returns available banks (ASPSPs) from Enable Banking for the given country.
 * Used to populate the bank picker UI before starting the connect flow.
 */
import { getHoldedSession } from '@/app/lib/holded-session';
import { listAspsps } from '@verifactu/integrations/enable-banking';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }

  const country = request.nextUrl.searchParams.get('country') ?? 'ES';

  try {
    const aspsps = await listAspsps(country);
    return NextResponse.json({ aspsps });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
