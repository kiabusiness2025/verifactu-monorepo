import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para callback OAuth2 de Google Drive
 * GET /api/integrations/gdrive/callback?code=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=integrations&error=no_code`
      );
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/gdrive/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=integrations&error=token_exchange`
      );
    }

    // TODO: Guardar tokens en base de datos
    // await saveUserIntegration({
    //   userId: session.user.id,
    //   provider: 'gdrive',
    //   accessToken: tokens.access_token,
    //   refreshToken: tokens.refresh_token,
    //   expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    // });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=integrations&success=gdrive_connected`
    );
  } catch (error) {
    console.error('Error processing Google Drive callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=integrations&error=callback_failed`
    );
  }
}
