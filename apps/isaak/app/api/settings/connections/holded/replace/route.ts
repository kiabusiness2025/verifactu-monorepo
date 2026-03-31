import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  buildHoldedProbeSummary,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { recordUsageEvent } from '@verifactu/integrations';
import { loadSettingsData, toSettingsSession } from '@/app/lib/settings';

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
    await recordUsageEvent({
      prisma,
      tenantId: session.tenantId,
      userId: session.userId,
      type: 'CONNECTION_ERROR',
      source: 'isaak_settings_holded_replace',
      path: '/api/settings/connections/holded/replace',
      metadataJson: {
        provider: 'holded',
        reason: probe.error || diagnostics.summary,
        validationSummary: diagnostics.summary,
      },
    });

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

  await saveHoldedConnection({
    tenantId: session.tenantId,
    userId: session.userId,
    apiKey,
    probe,
    channel: 'dashboard',
  });

  await recordUsageEvent({
    prisma,
    tenantId: session.tenantId,
    userId: session.userId,
    type: 'HOLDED_CONNECTED',
    source: 'isaak_settings_holded_replace',
    path: '/api/settings/connections/holded/replace',
    metadataJson: {
      provider: 'holded',
      supportedModules: diagnostics.supportedModules,
      validationSummary: diagnostics.summary,
    },
  });

  const settings = await loadSettingsData(session);
  return NextResponse.json({ ok: true, data: settings.connection });
}
