import { NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { disconnectGoogleDriveIntegration } from '@/lib/integrations/googleDriveStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await disconnectGoogleDriveIntegration(auth.tenantId);
  return NextResponse.json({ ok: true });
}
