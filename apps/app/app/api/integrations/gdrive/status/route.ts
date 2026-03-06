import { NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { decryptIntegrationSecret } from '@/lib/integrations/secretCrypto';
import { getGoogleDriveIntegration } from '@/lib/integrations/googleDriveStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const row = await getGoogleDriveIntegration(auth.tenantId);
  if (!row) {
    return NextResponse.json({
      provider: 'google_drive',
      connected: false,
      status: 'disconnected',
      lastSyncAt: null,
      lastError: null,
      folderName: null,
      folderId: null,
      folderWebViewLink: null,
      email: null,
    });
  }

  let payload: Record<string, unknown> = {};
  if (row.api_key_enc) {
    try {
      payload = JSON.parse(decryptIntegrationSecret(row.api_key_enc)) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  return NextResponse.json({
    provider: 'google_drive',
    connected: row.status === 'connected',
    status: row.status,
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
    folderName: typeof payload.appFolderName === 'string' ? payload.appFolderName : null,
    folderId: typeof payload.appFolderId === 'string' ? payload.appFolderId : null,
    folderWebViewLink:
      typeof payload.appFolderWebViewLink === 'string' ? payload.appFolderWebViewLink : null,
    email: typeof payload.googleEmail === 'string' ? payload.googleEmail : null,
  });
}
