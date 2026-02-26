import { requireTenantContext } from '@/lib/api/tenantAuth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    ok: true,
    movementId: id,
    tenantId: auth.tenantId,
    note: 'Sprint 3: conciliación persistente pendiente de activar',
  });
}
