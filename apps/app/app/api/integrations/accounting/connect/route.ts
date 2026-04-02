import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import prisma from '@/lib/prisma';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import {
  encryptIntegrationSecret,
  maskSecret,
  probeAccountingApiConnection,
} from '@/lib/integrations/accounting';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const HOLDED_CONNECTION_LEGAL_VERSION =
  process.env.HOLDED_CONNECTION_LEGAL_VERSION?.trim() || 'holded_connection_v1';

function describeConnectError(error: unknown) {
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
      'Unknown Holded connection error'
    );
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable Holded connection error object';
    }
  }

  return String(error || 'Unknown Holded connection error');
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
  let stage: 'auth' | 'access' | 'body' | 'encrypt' | 'probe' | 'persist' = 'auth';
  let tenantId: string | null = null;
  let resolvedUserId: string | null = null;
  let sessionUid: string | null = null;

  try {
    const auth = await requireTenantContext({
      channelType: entryChannel,
      metadata: {
        source: entryChannel === 'chatgpt' ? 'holded-first-onboarding' : 'requireTenantContext',
      },
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

    stage = 'encrypt';
    const encrypted = encryptIntegrationSecret(apiKey);

    stage = 'probe';
    const probe = await probeAccountingApiConnection(apiKey);
    const status = probe.ok ? 'connected' : 'error';
    const normalizedError = probe.ok
      ? null
      : probe.error || 'Error de validación de integración Holded';

    stage = 'persist';
    const legalAcceptedAt = new Date();
    const saved = await upsertAccountingIntegration({
      tenantId: auth.tenantId,
      apiKeyEnc: encrypted,
      status,
      lastError: normalizedError,
      connectedByUserId: auth.resolvedUserId ?? null,
      channelKey: entryChannel,
      legalTermsAcceptedAt: legalAcceptedAt,
      legalPrivacyAcceptedAt: legalAcceptedAt,
      legalAcceptanceVersion: HOLDED_CONNECTION_LEGAL_VERSION,
    });

    if (probe.ok) {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: auth.tenantId },
          select: { name: true },
        });

        await sendHoldedConnectionLifecycleEmails({
          userEmail: auth.session.email ?? null,
          userName: auth.session.name ?? null,
          tenantName: tenant?.name || 'tu empresa',
          action: 'connected',
          channel: entryChannel,
        });
      } catch (notificationError) {
        console.error('[api/integrations/accounting/connect] notification failed', {
          tenantId: auth.tenantId,
          entryChannel,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }
    }

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
    const detail = describeConnectError(error);
    const genericError =
      stage === 'persist'
        ? 'No se pudo guardar la conexion de Holded'
        : 'No se pudo conectar Holded';

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
