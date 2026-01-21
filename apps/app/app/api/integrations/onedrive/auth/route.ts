import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para iniciar flujo OAuth2 con OneDrive
 * GET /api/integrations/onedrive/auth
 */
export async function GET(req: Request) {
  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/onedrive/callback`;

    const scope = [
      'offline_access',
      'User.Read',
      'Files.Read',
      'Files.ReadWrite',
      'Files.Read.All',
    ].join(' ');

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_mode', 'query');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating OneDrive OAuth:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al iniciar autenticación con OneDrive' },
      { status: 500 }
    );
  }
}
