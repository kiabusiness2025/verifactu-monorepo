import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para continuar.' },
      { status: 401 }
    );
  }

  const connection = await getHoldedConnection(session.tenantId);

  return NextResponse.json({
    connected: Boolean(connection),
    status: connection?.status || 'disconnected',
    keyMasked: connection?.keyMasked || null,
    connectedAt: connection?.connectedAt || null,
    lastValidatedAt: connection?.lastValidatedAt || null,
    lastSyncAt: connection?.lastSyncAt || null,
    supportedModules: connection?.supportedModules || [],
    validationSummary: connection?.validationSummary || null,
    providerAccountId: connection?.providerAccountId || null,
    tenantName: connection?.tenantName || null,
    legalName: connection?.legalName || null,
    taxId: connection?.taxId || null,
    tenantId: session.tenantId,
  });
}
