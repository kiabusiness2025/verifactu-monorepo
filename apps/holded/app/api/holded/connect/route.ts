import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  disconnectHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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

  const saved = await saveHoldedConnection({
    tenantId: session.tenantId,
    apiKey,
    userId: session.userId,
    probe,
  });

  return NextResponse.json({
    ok: true,
    probe,
    connection: saved,
  });
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
  });

  return NextResponse.json({
    ok: true,
    connection: disconnected,
  });
}
