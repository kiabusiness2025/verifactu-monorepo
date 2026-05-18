/**
 * GET /api/integrations/holded/connection-status?userId=...&channel=claude
 *
 * Endpoint server-to-server (shared secret) que consulta el estado real de la
 * conexión Holded de un usuario en un canal concreto.
 *
 * Usado por `apps/holded-mcp` en `/oauth/authorize` para decidir si el usuario
 * necesita re-loginarse (force_relogin) cuando previamente revocó el conector
 * desde Claude. Devuelve datos mínimos — solo lo necesario para tomar la
 * decisión sin acoplar a holded-mcp con el modelo Prisma.
 *
 * Auth: shared secret en cabecera `x-verifactu-shared-secret` (env var
 * `VERIFACTU_APP_SHARED_SECRET`). Mismo patrón que connector-event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

type Channel = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';
const VALID_CHANNELS: Channel[] = ['dashboard', 'chatgpt', 'mobile', 'claude'];

type StatusResponse = {
  ok: true;
  active: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'none';
  tenantId: string | null;
  disconnectedAt: string | null;
};

function authorize(request: NextRequest): boolean {
  const expected = process.env.VERIFACTU_APP_SHARED_SECRET?.trim();
  if (!expected) return true; // misma laxitud que connector-event en dev
  const provided = request.headers.get('x-verifactu-shared-secret');
  return !!provided && provided === expected;
}

function isValidChannel(value: string | null): value is Channel {
  return value !== null && VALID_CHANNELS.includes(value as Channel);
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId')?.trim();
  const channel = url.searchParams.get('channel')?.trim() ?? 'claude';

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing_user_id' }, { status: 400 });
  }
  if (!isValidChannel(channel)) {
    return NextResponse.json({ ok: false, error: 'invalid_channel' }, { status: 400 });
  }

  // Buscamos la conexión Holded asociada al usuario en este canal.
  // Si el usuario tiene varios tenants, priorizamos la más recientemente
  // actualizada en estado 'connected' — si no hay ninguna, devolvemos la más
  // reciente en cualquier estado para reportar `disconnectedAt`.
  try {
    const connections = await prisma.externalConnection.findMany({
      where: {
        provider: 'holded',
        channelKey: channel,
        OR: [{ connectedByUserId: userId }, { technicalOperatorUserId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        tenantId: true,
        connectionStatus: true,
        disconnectedAt: true,
      },
      take: 5,
    });

    if (connections.length === 0) {
      const body: StatusResponse = {
        ok: true,
        active: false,
        connectionStatus: 'none',
        tenantId: null,
        disconnectedAt: null,
      };
      return NextResponse.json(body, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const active = connections.find((c) => c.connectionStatus === 'connected') ?? null;
    const chosen = active ?? connections[0];

    const body: StatusResponse = {
      ok: true,
      active: !!active,
      connectionStatus: chosen.connectionStatus === 'connected' ? 'connected' : 'disconnected',
      tenantId: chosen.tenantId,
      disconnectedAt: chosen.disconnectedAt ? chosen.disconnectedAt.toISOString() : null,
    };

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[connection-status] query failed', {
      userId,
      channel,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
  }
}
