import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api/tenantAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para iniciar flujo OAuth2 con Google Drive
 * GET /api/integrations/gdrive/auth
 */
const OAUTH_STATE_COOKIE = 'vf_gdrive_oauth_state';

function resolveBaseUrl(req: NextRequest) {
  return process.env.NEXTAUTH_URL?.trim() || new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTenantContext();
    if ('error' in auth) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const baseUrl = resolveBaseUrl(req);
    const redirectUri = `${baseUrl}/api/integrations/gdrive/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: 'GOOGLE_CLIENT_ID no configurado' },
        { status: 500 }
      );
    }

    const scope = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' ');

    const state = Buffer.from(
      JSON.stringify({
        nonce: randomBytes(16).toString('hex'),
        tenantId: auth.tenantId,
        createdAt: Date.now(),
      })
    ).toString('base64url');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: state,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error('Error initiating Google Drive OAuth:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al iniciar autenticación con Google Drive' },
      { status: 500 }
    );
  }
}
