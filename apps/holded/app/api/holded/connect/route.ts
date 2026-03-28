import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  disconnectHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { writeHoldedActivity } from '@/app/lib/holded-activity';

export const runtime = 'nodejs';

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function hasBasicApiKeyShape(value: string) {
  return value.length >= 16 && value.length <= 128;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getHoldedSession();

    if (!session?.tenantId) {
      return NextResponse.json(
        { error: 'Necesitas iniciar sesion para conectar Holded.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === 'string' ? normalizeApiKey(body.apiKey) : '';

    if (!apiKey) {
      return NextResponse.json({ error: 'Pega una API key valida de Holded.' }, { status: 400 });
    }

    if (!hasBasicApiKeyShape(apiKey)) {
      return NextResponse.json(
        { error: 'La API key parece incompleta. Revísala y vuelve a pegarla.' },
        { status: 400 }
      );
    }

    const probe = await probeHoldedConnection(apiKey);

    if (!probe.ok) {
      await writeHoldedActivity({
        tenantId: session.tenantId,
        userId: session.userId,
        action: 'connection_error',
        status: 'failed',
        resourceType: 'holded_connection',
        responsePayload: {
          provider: 'holded',
          error: probe.error,
        },
      });

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
  } catch (error) {
    console.error('[holded connect] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          'La API key es valida, pero no hemos podido terminar de guardarla. Intenta de nuevo en unos segundos o escribe a soporte.',
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
  });

  return NextResponse.json({
    ok: true,
    connection: disconnected,
  });
}
