import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { recordUsageEvent } from '@verifactu/integrations';
import {
  disconnectHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function normalizeChannel(value: unknown) {
  return value === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function hasBasicApiKeyShape(value: string) {
  return value.length >= 16 && value.length <= 128;
}

function readProbeSupportedModules(probe: Awaited<ReturnType<typeof probeHoldedConnection>>) {
  return [
    probe.invoiceApi.ok ? 'invoicing' : null,
    probe.accountingApi.ok ? 'accounting' : null,
    probe.crmApi.ok ? 'crm' : null,
    probe.projectsApi.ok ? 'projects' : null,
    probe.teamApi.ok ? 'team' : null,
  ].filter((value): value is string => Boolean(value));
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
    const channel = normalizeChannel(body?.channel);

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
      await Promise.allSettled([
        writeHoldedActivity({
          tenantId: session.tenantId,
          userId: session.userId,
          action: 'connection_error',
          status: 'failed',
          resourceType: 'holded_connection',
          responsePayload: {
            provider: 'holded',
            error: probe.error,
          },
        }),
        recordUsageEvent({
          prisma,
          tenantId: session.tenantId,
          userId: session.userId,
          type: 'CONNECTION_ERROR',
          source: 'holded_connect',
          path: '/api/holded/connect',
          metadataJson: {
            provider: 'holded',
            reason: probe.error || 'validation_failed',
          },
        }),
      ]);

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
      channel,
    });

    await Promise.allSettled([
      recordUsageEvent({
        prisma,
        tenantId: session.tenantId,
        userId: session.userId,
        type: 'HOLDED_CONNECTED',
        source: 'holded_connect',
        path: '/api/holded/connect',
        metadataJson: {
          provider: 'holded',
          channel,
          status: saved?.connected ? 'connected' : 'pending',
          supportedModules: readProbeSupportedModules(probe),
        },
      }),
      ...(session.email
        ? [
            sendHoldedConnectedCommunication({
              name: session.name || session.email.split('@')[0] || 'Hola',
              email: session.email,
              companyName: saved?.tenantName || 'tu empresa',
              supportedModules: readProbeSupportedModules(probe),
            }),
          ]
        : []),
    ]);

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

export async function DELETE(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para desconectar Holded.' },
      { status: 401 }
    );
  }

  const channel = normalizeChannel(new URL(request.url).searchParams.get('channel'));
  const disconnected = await disconnectHoldedConnection({
    tenantId: session.tenantId,
    userId: session.userId,
    channel,
  });

  return NextResponse.json({
    ok: true,
    connection: disconnected,
  });
}
