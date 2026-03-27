import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { probeHoldedConnection } from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

function isLikelyHoldedApiKey(value: string) {
  return /^[a-f0-9]{32}$/i.test(value.trim());
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para validar la API key.' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

  if (!apiKey) {
    return NextResponse.json({ error: 'Pega una API key valida de Holded.' }, { status: 400 });
  }

  if (!isLikelyHoldedApiKey(apiKey)) {
    return NextResponse.json(
      { error: 'La API key no tiene un formato valido de Holded.' },
      { status: 400 }
    );
  }

  const probe = await probeHoldedConnection(apiKey);

  return NextResponse.json({
    ok: probe.ok,
    probe,
    error: probe.ok ? null : probe.error,
  });
}
