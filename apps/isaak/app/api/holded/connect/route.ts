import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  disconnectHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { sendHoldedConnectNotifications } from '@/app/lib/communications/holded-connect-emails';

export const runtime = 'nodejs';

async function retrySaveHoldedConnection(input: {
  tenantId: string;
  apiKey: string;
  userId?: string | null;
  probe: Awaited<ReturnType<typeof probeHoldedConnection>>;
}) {
  try {
    return await saveHoldedConnection({
      ...input,
      channel: 'dashboard',
    });
  } catch (firstError) {
    console.warn('[isaak holded connect] first save attempt failed, retrying', {
      error: firstError instanceof Error ? firstError.message : String(firstError),
    });

    return saveHoldedConnection({
      ...input,
      channel: 'dashboard',
    });
  }
}

export async function POST(request: NextRequest) {
  let stage = 'session';
  try {
    const session = await getHoldedSession();

    if (!session?.tenantId) {
      return NextResponse.json(
        { error: 'Necesitas iniciar sesion para conectar Holded.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!apiKey) {
      return NextResponse.json({ error: 'Pega una API key valida de Holded.' }, { status: 400 });
    }

    stage = 'probe';
    const probe = await probeHoldedConnection(apiKey);

    if (!probe.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: probe.error || 'No hemos podido validar la API key.',
          probe,
        },
        { status: 400 }
      );
    }

    stage = 'persist';
    const saved = await retrySaveHoldedConnection({
      tenantId: session.tenantId,
      apiKey,
      userId: session.userId,
      probe,
    });

    // Fire-and-forget welcome emails (user + admin)
    sendHoldedConnectNotifications({
      userEmail: session.email ?? null,
      userName: session.name ?? null,
      companyName: saved.tenantName ?? null,
      connectedAt: new Date().toISOString(),
      supportedModules: saved.supportedModules ?? [],
    }).catch((err) => console.warn('[holded/connect] welcome email failed', err));

    return NextResponse.json({
      ok: true,
      probe,
      connection: saved,
    });
  } catch (error) {
    console.error('[isaak holded connect] failed', {
      stage,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          'La conexion es valida, pero no hemos podido terminar de guardarla. Intenta de nuevo en unos segundos o escribe a soporte.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para desconectar Holded.' },
      { status: 401 }
    );
  }

  const disconnected = await disconnectHoldedConnection({
    tenantId: session.tenantId,
    userId: session.userId,
    channel: 'dashboard',
  });

  return NextResponse.json({
    ok: true,
    connection: disconnected,
  });
}
