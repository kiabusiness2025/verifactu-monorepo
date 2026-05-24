import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { exchangeMicrosoftCode, getMicrosoftUserProfile } from '@/app/lib/microsoft-oauth';
import { sendMicrosoftConnectedNotification } from '@/app/lib/communications/integration-emails';

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
    return NextResponse.redirect(`${integrationsUrl}?microsoft=error`);
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
    return NextResponse.redirect(`${integrationsUrl}?microsoft=error`);
  }

  try {
    const tokens = await exchangeMicrosoftCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const profile = await getMicrosoftUserProfile(tokens.access_token);

    await prisma.isaakMicrosoftToken.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: {
        tenantId,
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        email: profile.email,
        displayName: profile.displayName,
        scopes: tokens.scope,
      },
      update: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt,
        email: profile.email,
        displayName: profile.displayName,
        scopes: tokens.scope,
      },
    });

    // Load Isaak user info for email (best-effort, non-blocking)
    const user = await prisma.user
      .findUnique({ where: { id: userId }, select: { email: true, name: true } })
      .catch(() => null);
    sendMicrosoftConnectedNotification({
      userEmail: user?.email ?? null,
      userName: user?.name ?? null,
      microsoftEmail: profile.email,
      microsoftDisplayName: profile.displayName,
    }).catch(() => null);

    return NextResponse.redirect(`${integrationsUrl}?microsoft=connected`);
  } catch {
    return NextResponse.redirect(`${integrationsUrl}?microsoft=error`);
  }
}
