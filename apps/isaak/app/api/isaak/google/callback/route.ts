import { exchangeCodeForTokens, getUserEmail } from '@/app/lib/google-calendar';
import { prisma } from '@/app/lib/prisma';
import { sendGoogleConnectedNotification } from '@/app/lib/communications/integration-emails';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
  const integrationsUrl = `${appUrl}/integrations`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${integrationsUrl}?google=error`);
  }

  let tenantId: string;
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
      tenantId: string;
      userId: string;
    };
    tenantId = decoded.tenantId;
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${integrationsUrl}?google=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const email = await getUserEmail(tokens.access_token);

    await prisma.isaakGoogleToken.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: {
        tenantId,
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        email,
        scopes: tokens.scope,
      },
      update: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt,
        email,
        scopes: tokens.scope,
      },
    });

    // Load user info for email (best-effort, non-blocking)
    const user = await prisma.user
      .findUnique({ where: { id: userId }, select: { email: true, name: true } })
      .catch(() => null);
    sendGoogleConnectedNotification({
      userEmail: user?.email ?? null,
      userName: user?.name ?? null,
      connectedGoogleEmail: email,
    }).catch(() => null);

    return NextResponse.redirect(`${integrationsUrl}?google=connected`);
  } catch {
    return NextResponse.redirect(`${integrationsUrl}?google=error`);
  }
}
