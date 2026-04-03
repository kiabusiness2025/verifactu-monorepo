import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { probeHoldedConnection } from '@/app/lib/holded-integration';
import { mintHoldedValidationToken } from '@/app/lib/holded-validation-token';

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

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para validar la API key.' },
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
  const validationToken = probe.ok
    ? await mintHoldedValidationToken({
        tenantId: session.tenantId,
        channel,
        apiKey,
        probe,
      })
    : null;

  return NextResponse.json({
    ok: probe.ok,
    probe,
    error: probe.ok ? null : probe.error,
    validationToken,
  });
}
