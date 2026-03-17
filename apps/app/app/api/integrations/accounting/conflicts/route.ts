import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import { listSyncConflicts } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const enabled = await canBidirectionalQuotes(auth.tenantId);
  if (!enabled) {
    return NextResponse.json(
      { error: 'La gestión de conflictos de presupuestos está disponible en Empresa y PRO.' },
      { status: 403 }
    );
  }

  const entity = request.nextUrl.searchParams.get('entity');
  if (entity !== 'quotes') {
    return NextResponse.json({ error: 'entity must be quotes' }, { status: 400 });
  }

  const items = await listSyncConflicts(auth.tenantId, 'quote');
  return NextResponse.json({ items });
}
