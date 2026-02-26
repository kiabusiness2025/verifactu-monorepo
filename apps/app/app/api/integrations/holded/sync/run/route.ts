import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  appendSyncLog,
  getPendingOutbox,
  markOutboxDone,
  markOutboxError,
  setIntegrationError,
  touchIntegrationSyncOk,
} from '@/lib/integrations/holdedStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const runId = `sync_${Date.now()}`;
  const pending = await getPendingOutbox(auth.tenantId, 50);

  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      // Placeholder push: en Sprint 2 se reemplaza por adapter real Holded.
      await markOutboxDone(item.id);
      await appendSyncLog({
        tenantId: auth.tenantId,
        outboxId: item.id,
        level: 'info',
        message: `SYNC_OK ${item.entity_type}:${item.entity_id}`,
        data: { runId, action: item.action },
      });
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido en sync';
      await markOutboxError(item.id, message);
      await appendSyncLog({
        tenantId: auth.tenantId,
        outboxId: item.id,
        level: 'error',
        message: `SYNC_ERROR ${item.entity_type}:${item.entity_id}`,
        data: { runId, error: message },
      });
      failed += 1;
    }
  }

  if (failed > 0) {
    await setIntegrationError(auth.tenantId, `${failed} elementos en error durante sync manual`);
  } else {
    await touchIntegrationSyncOk(auth.tenantId);
  }

  return NextResponse.json({
    ok: failed === 0,
    runId,
    counts: {
      queued: pending.length,
      processed,
      failed,
    },
  });
}
