import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getTenantFeatureFlags } from '@/lib/billing/tenantPlan';
import { encryptIntegrationSecret, maskSecret, probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const flags = await getTenantFeatureFlags(auth.tenantId);
  if (!flags.canUseAccountingApiIntegration) {
    return NextResponse.json(
      {
        error:
          'La integración con tu programa de contabilidad vía API es opcional y está disponible en planes Empresa y PRO.',
        plan: flags.planCode ?? 'unknown',
        allowedPlans: ['empresa', 'pro'],
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey es obligatorio' }, { status: 400 });
  }

  let encrypted: string;
  try {
    encrypted = encryptIntegrationSecret(apiKey);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo cifrar la API key' },
      { status: 500 }
    );
  }

  const probe = await probeAccountingApiConnection(apiKey);
  const status = probe.ok ? 'connected' : 'error';
  const normalizedError = probe.ok ? null : probe.error || 'Error de validación de integración Holded';

  const saved = await upsertAccountingIntegration({
    tenantId: auth.tenantId,
    apiKeyEnc: encrypted,
    status,
    lastError: normalizedError,
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
}
