import { NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { decryptIntegrationSecret } from '@/lib/integrations/secretCrypto';
import { getGoogleDriveIntegration } from '@/lib/integrations/googleDriveStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getMissingEnv() {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INTEGRATIONS_SECRET_KEY'] as const;
  return required.filter((key) => !process.env[key]?.trim());
}

export async function GET() {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const missingEnv = getMissingEnv();
  const oauthReady = missingEnv.length === 0;
  const row = await getGoogleDriveIntegration(auth.tenantId);
  if (!row) {
    return NextResponse.json({
      provider: 'google_drive',
      connected: false,
      status: oauthReady ? 'disconnected' : 'configuration_required',
      lastSyncAt: null,
      lastError: oauthReady
        ? null
        : `Faltan variables de entorno: ${missingEnv.join(', ')}`,
      folderName: null,
      folderId: null,
      folderWebViewLink: null,
      email: null,
      oauthReady,
      missingEnv,
    });
  }

  let payload: Record<string, unknown> = {};
  let decryptError: string | null = null;
  if (row.api_key_enc) {
    try {
      payload = JSON.parse(decryptIntegrationSecret(row.api_key_enc)) as Record<string, unknown>;
    } catch (error) {
      payload = {};
      decryptError =
        error instanceof Error ? error.message : 'No se pudo descifrar la configuración';
    }
  }

  return NextResponse.json({
    provider: 'google_drive',
    connected: row.status === 'connected',
    status: oauthReady ? row.status : 'configuration_required',
    lastSyncAt: row.last_sync_at,
    lastError:
      row.last_error ||
      decryptError ||
      (oauthReady ? null : `Faltan variables de entorno: ${missingEnv.join(', ')}`),
    folderName: typeof payload.appFolderName === 'string' ? payload.appFolderName : null,
    folderId: typeof payload.appFolderId === 'string' ? payload.appFolderId : null,
    folderWebViewLink:
      typeof payload.appFolderWebViewLink === 'string' ? payload.appFolderWebViewLink : null,
    email: typeof payload.googleEmail === 'string' ? payload.googleEmail : null,
    oauthReady,
    missingEnv,
  });
}
