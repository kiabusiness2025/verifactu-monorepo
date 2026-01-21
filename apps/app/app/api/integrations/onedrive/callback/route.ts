import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API para callback OAuth2 de OneDrive
 * GET /api/integrations/onedrive/callback?code=...
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

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/onedrive/callback`,
          grant_type: 'authorization_code',
        }),
      }
    );

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
    //   provider: 'onedrive',
    //   accessToken: tokens.access_token,
    //   refreshToken: tokens.refresh_token,
    //   expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    // });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=integrations&success=onedrive_connected`
    );
  } catch (error) {
    console.error('Error processing OneDrive callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=integrations&error=callback_failed`
    );
  }
}
