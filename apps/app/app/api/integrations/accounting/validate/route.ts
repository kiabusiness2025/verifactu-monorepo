import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { maskSecret, probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function describeValidateError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
    };
    return (
      [candidate.message, candidate.code, candidate.detail, candidate.constraint, candidate.table]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' | ') ||
      candidate.name ||
      'Unknown Holded validation error'
    );
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable Holded validation error object';
    }
  }

  return String(error || 'Unknown Holded validation error');
}

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
  let stage: 'auth' | 'access' | 'body' | 'probe' = 'auth';

  try {
    const auth = await requireTenantContext({
      channelType: entryChannel,
      metadata: {
        source: entryChannel === 'chatgpt' ? 'holded-validation' : 'requireTenantContext',
      },
      onboardingToken,
    });
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

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
    const apiKey = typeof body?.apiKey === 'string' ? normalizeHoldedApiKey(body.apiKey) : '';
    const acceptedTerms = body?.acceptedTerms === true;
    const acceptedPrivacy = body?.acceptedPrivacy === true;

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey es obligatorio' }, { status: 400 });
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json(
        {
          error:
            'Debes aceptar los Terminos y la Politica de Privacidad de verifactu.business para continuar.',
        },
        { status: 400 }
      );
    }

    stage = 'probe';
    const probe = await probeAccountingApiConnection(apiKey);

    return NextResponse.json({
      ok: probe.ok,
      provider: 'holded',
      keyMasked: maskSecret(apiKey),
      probe,
    });
  } catch (error) {
    const detail = describeValidateError(error);

    console.error('[api/integrations/accounting/validate] failed', {
      stage,
      entryChannel,
      detail,
    });

    return NextResponse.json(
      {
        error: 'No se pudo validar la API key de Holded',
        detail,
        stage,
        debug: `No se pudo validar la API key de Holded [${stage}] ${detail}`,
      },
      { status: 500 }
    );
  }
}
