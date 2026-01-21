import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para iniciar flujo OAuth2 con Microsoft/Outlook
 * GET /api/integrations/microsoft/auth
 */
export async function GET(req: Request) {
  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`;

    const scope = ['offline_access', 'User.Read', 'Mail.Read', 'Mail.Send', 'Mail.ReadWrite'].join(
      ' '
    );

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_mode', 'query');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating Microsoft OAuth:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al iniciar autenticación con Microsoft' },
      { status: 500 }
    );
  }
}
