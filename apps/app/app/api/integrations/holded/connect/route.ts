import { requireTenantContext } from '@/lib/api/tenantAuth';
import { encryptIntegrationSecret, maskSecret, probeHoldedConnection } from '@/lib/integrations/holded';
import { upsertHoldedIntegration } from '@/lib/integrations/holdedStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  const probe = await probeHoldedConnection(apiKey);
  const status = probe.ok ? 'connected' : 'error';

  const saved = await upsertHoldedIntegration({
    tenantId: auth.tenantId,
    apiKeyEnc: encrypted,
    status,
    lastError: probe.ok ? null : probe.detail || 'Error de validación Holded',
  });

  return NextResponse.json({
    ok: probe.ok,
    provider: 'holded',
    status: saved?.status ?? status,
    lastSyncAt: saved?.last_sync_at ?? null,
    lastError: saved?.last_error ?? null,
    keyMasked: maskSecret(apiKey),
  });
}
