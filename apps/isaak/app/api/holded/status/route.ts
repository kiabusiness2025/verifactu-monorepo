import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

export async function GET() {
  let session;
  try {
    session = await getHoldedSession();
  } catch (error) {
    console.error('[holded/status] session resolution failed', error);
    return NextResponse.json(
      { error: 'No he podido validar tu sesion ahora mismo.' },
      { status: 503 }
    );
  }

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para continuar.' },
      { status: 401 }
    );
  }

  let connection = null;
  try {
    connection = await getHoldedConnection(session.tenantId);
  } catch (error) {
    console.error('[holded/status] connection read failed', {
      tenantId: session.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

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
