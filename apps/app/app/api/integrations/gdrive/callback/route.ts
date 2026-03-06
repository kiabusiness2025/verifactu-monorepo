import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { encryptIntegrationSecret } from '@/lib/integrations/secretCrypto';
import { upsertGoogleDriveIntegration } from '@/lib/integrations/googleDriveStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OAUTH_STATE_COOKIE = 'vf_gdrive_oauth_state';
const GOOGLE_DRIVE_FOLDER_NAME = 'verifactu_business';

function resolveBaseUrl(req: NextRequest) {
  return process.env.NEXTAUTH_URL?.trim() || new URL(req.url).origin;
}

function parseState(value: string) {
  const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
    nonce: string;
    tenantId: string;
    createdAt: number;
  };
  return decoded;
}

async function exchangeGoogleCodeForTokens(args: {
  code: string;
  redirectUri: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
  }

  const body = new URLSearchParams({
    code: args.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const tokens = (await tokenResponse.json().catch(() => null)) as
    | {
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
        scope?: string;
      }
    | null;

  if (!tokenResponse.ok || !tokens?.access_token) {
    throw new Error('TOKEN_EXCHANGE_FAILED');
  }
  return tokens;
}

async function getGoogleEmail(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => null)) as { email?: string } | null;
  if (!res.ok) return null;
  return data?.email ?? null;
}

async function ensureAppFolder(accessToken: string) {
  const query = encodeURIComponent(
    `name='${GOOGLE_DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = (await listRes.json().catch(() => null)) as
    | { files?: Array<{ id?: string; name?: string; webViewLink?: string }> }
    | null;

  if (listRes.ok && Array.isArray(listData?.files) && listData.files[0]?.id) {
    return {
      id: listData.files[0].id,
      name: listData.files[0].name ?? GOOGLE_DRIVE_FOLDER_NAME,
      webViewLink: listData.files[0].webViewLink ?? null,
    };
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const createData = (await createRes.json().catch(() => null)) as
    | { id?: string; name?: string; webViewLink?: string }
    | null;
  if (!createRes.ok || !createData?.id) {
    throw new Error('DRIVE_FOLDER_CREATE_FAILED');
  }

  return {
    id: createData.id,
    name: createData.name ?? GOOGLE_DRIVE_FOLDER_NAME,
    webViewLink: createData.webViewLink ?? null,
  };
}

/**
 * API para callback OAuth2 de Google Drive
 * GET /api/integrations/gdrive/callback?code=...
 */
export async function GET(req: NextRequest) {
  const baseUrl = resolveBaseUrl(req);
  const redirectBase = `${baseUrl}/dashboard/integrations`;

  try {
    const auth = await requireTenantContext();
    if ('error' in auth) {
      return NextResponse.redirect(`${redirectBase}?error=unauthorized`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

    if (!code || !state || !stateCookie || state !== stateCookie) {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    const parsedState = parseState(state);
    if (parsedState.tenantId !== auth.tenantId) {
      return NextResponse.redirect(`${redirectBase}?error=tenant_mismatch`);
    }

    const redirectUri = `${baseUrl}/api/integrations/gdrive/callback`;
    const tokens = await exchangeGoogleCodeForTokens({ code, redirectUri });
    const accessToken = tokens.access_token || '';
    const folder = await ensureAppFolder(accessToken);
    const googleEmail = await getGoogleEmail(accessToken);

    const payload = {
      provider: 'google_drive',
      connectedAt: new Date().toISOString(),
      tokenType: tokens.token_type ?? 'Bearer',
      scope: tokens.scope ?? '',
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      googleEmail,
      appFolderId: folder.id,
      appFolderName: folder.name,
      appFolderWebViewLink: folder.webViewLink,
    };

    const encrypted = encryptIntegrationSecret(JSON.stringify(payload));
    await upsertGoogleDriveIntegration({
      tenantId: auth.tenantId,
      encryptedPayload: encrypted,
      status: 'connected',
      lastError: null,
    });

    const response = NextResponse.redirect(`${redirectBase}?success=gdrive_connected`);
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: '',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Error processing Google Drive callback:', error);
    return NextResponse.redirect(`${redirectBase}?error=callback_failed`);
  }
}
