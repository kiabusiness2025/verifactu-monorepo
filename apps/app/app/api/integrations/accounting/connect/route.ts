import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { encryptIntegrationSecret, maskSecret, probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function getOnboardingToken(request: NextRequest) {
  return (
    request.headers.get('x-isaak-onboarding-token')?.trim() ||
    request.nextUrl.searchParams.get('onboarding_token')?.trim() ||
    null
  );
}

export async function POST(request: NextRequest) {
  const entryChannel = getEntryChannel(request);
  const onboardingToken = getOnboardingToken(request);
  let stage: 'auth' | 'access' | 'body' | 'encrypt' | 'probe' | 'persist' = 'auth';
  let tenantId: string | null = null;
  let resolvedUserId: string | null = null;
  let sessionUid: string | null = null;

  try {
    const auth = await requireTenantContext({
      channelType: entryChannel,
      metadata: { source: entryChannel === 'chatgpt' ? 'holded-first-onboarding' : 'requireTenantContext' },
      onboardingToken,
    });
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    tenantId = auth.tenantId;
    resolvedUserId = auth.resolvedUserId ?? null;
    sessionUid = auth.session.uid ?? null;

    stage = 'access';
    const access = await getAccountingIntegrationAccess({ tenantId: auth.tenantId, entryChannel });
    if (!access.canConnect) {
      return NextResponse.json(
        {
          error:
            'La integración con tu programa de contabilidad vía API es opcional y está disponible en planes Empresa y PRO.',
          plan: access.planCode ?? 'unknown',
          allowedPlans: ['empresa', 'pro'],
          connectionMode: access.connectionMode,
        },
        { status: 403 }
      );
    }

    stage = 'body';
    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey es obligatorio' }, { status: 400 });
    }

    stage = 'encrypt';
    const encrypted = encryptIntegrationSecret(apiKey);

    stage = 'probe';
    const probe = await probeAccountingApiConnection(apiKey);
    const status = probe.ok ? 'connected' : 'error';
    const normalizedError = probe.ok ? null : probe.error || 'Error de validación de integración Holded';

    stage = 'persist';
    const saved = await upsertAccountingIntegration({
      tenantId: auth.tenantId,
      apiKeyEnc: encrypted,
      status,
      lastError: normalizedError,
      connectedByUserId: auth.resolvedUserId ?? null,
    });

    return NextResponse.json({
      ok: probe.ok,
      provider: 'holded',
      status: saved?.status ?? status,
      lastSyncAt: saved?.last_sync_at ?? null,
      lastError: saved?.last_error ?? null,
      keyMasked: maskSecret(apiKey),
      probe,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Holded connection error';
    const genericError = stage === 'persist' ? 'No se pudo guardar la conexion de Holded' : 'No se pudo conectar Holded';

    console.error('[api/integrations/accounting/connect] failed', {
      stage,
      entryChannel,
      tenantId,
      resolvedUserId,
      sessionUid,
      detail,
    });

    return NextResponse.json(
      {
        error: genericError,
        detail,
        stage,
        debug: `${genericError} [${stage}] ${detail}`,
      },
      { status: 500 }
    );
  }
}
