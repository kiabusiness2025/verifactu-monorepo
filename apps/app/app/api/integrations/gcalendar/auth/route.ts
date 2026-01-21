import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para iniciar flujo OAuth2 con Google Calendar
 * GET /api/integrations/gcalendar/auth
 */
export async function GET(req: Request) {
  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/gcalendar/callback`;

    const scope = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating Google Calendar OAuth:', error);
    return NextResponse.json(
      { ok: false, error: 'Error al iniciar autenticación con Google Calendar' },
      { status: 500 }
    );
  }
}
