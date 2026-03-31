import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildHoldedProbeSummary, probeHoldedConnection } from '@/app/lib/holded-integration';
import { toSettingsSession } from '@/app/lib/settings';

export const runtime = 'nodejs';

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function hasBasicApiKeyShape(value: string) {
  return value.length >= 16 && value.length <= 128;
}

export async function POST(req: Request) {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const apiKey = typeof body.apiKey === 'string' ? normalizeApiKey(body.apiKey) : '';

  if (!apiKey) {
    return NextResponse.json({ error: 'Pega una API key valida de Holded.' }, { status: 400 });
  }

  if (!hasBasicApiKeyShape(apiKey)) {
    return NextResponse.json(
      { error: 'La API key parece incompleta. Revisala y vuelve a pegarla.' },
      { status: 400 }
    );
  }

  const probe = await probeHoldedConnection(apiKey);
  const diagnostics = buildHoldedProbeSummary(probe);
  if (!probe.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: probe.error || diagnostics.summary,
        diagnostics,
        probe,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, diagnostics, probe });
}
