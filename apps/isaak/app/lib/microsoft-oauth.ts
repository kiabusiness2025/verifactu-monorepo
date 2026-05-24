import { prisma } from '@/app/lib/prisma';

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export const MICROSOFT_SCOPES = [
  'https://graph.microsoft.com/Files.ReadWrite',
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/User.Read',
  'offline_access',
].join(' ');

function getClientId() {
  return process.env.MICROSOFT_CLIENT_ID ?? '';
}
function getClientSecret() {
  return process.env.MICROSOFT_CLIENT_SECRET ?? '';
}
export function getMicrosoftRedirectUri() {
  if (process.env.MICROSOFT_REDIRECT_URI) return process.env.MICROSOFT_REDIRECT_URI;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
  return `${base}/api/isaak/microsoft/callback`;
}

export function buildMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getMicrosoftRedirectUri(),
    response_type: 'code',
    scope: MICROSOFT_SCOPES,
    response_mode: 'query',
    state,
  });
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeMicrosoftCode(code: string): Promise<TokenResponse> {
  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getMicrosoftRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }
  return res.json() as Promise<TokenResponse>;
}

async function refreshMicrosoftToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
      scope: MICROSOFT_SCOPES,
    }),
  });
  if (!res.ok) throw new Error('Microsoft token refresh failed');
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function getMicrosoftUserProfile(
  accessToken: string
): Promise<{ email: string | null; displayName: string | null }> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,displayName', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { email: null, displayName: null };
  const data = (await res.json()) as { mail?: string; displayName?: string };
  return { email: data.mail ?? null, displayName: data.displayName ?? null };
}

export async function getValidMicrosoftToken(
  tenantId: string,
  userId: string
): Promise<string | null> {
  const token = await prisma.isaakMicrosoftToken.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!token) return null;

  if (token.expiresAt && token.expiresAt.getTime() > Date.now() + 60_000) {
    return token.accessToken;
  }

  if (!token.refreshToken) return null;

  try {
    const refreshed = await refreshMicrosoftToken(token.refreshToken);
    await prisma.isaakMicrosoftToken.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export function isMicrosoftConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}
