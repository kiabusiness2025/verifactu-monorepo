// Helpers for reading and auto-refreshing ErpOAuthToken records.
// Tokens are stored encrypted with the same AES-256-GCM scheme as Holded keys
// (INTEGRATIONS_SECRET_KEY via encryptHoldedSecret / decryptHoldedSecret).

import { decryptHoldedSecret, encryptHoldedSecret } from './holded-integration';
import { prisma } from './prisma';

function addSeconds(date: Date, s: number): Date {
  return new Date(date.getTime() + s * 1000);
}

async function doRefresh(
  provider: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const base =
    provider === 'sage_200c'
      ? (process.env.SAGE_OAUTH_BASE ?? 'https://id.sage.com')
      : (process.env.A3_OAUTH_BASE ?? 'https://identity.a3developers.wolterskluwer.es');

  const clientId = provider === 'sage_200c' ? process.env.SAGE_CLIENT_ID : process.env.A3_CLIENT_ID;

  const clientSecret =
    provider === 'sage_200c' ? process.env.SAGE_CLIENT_SECRET : process.env.A3_CLIENT_SECRET;

  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId ?? '',
      client_secret: clientSecret ?? '',
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth refresh failed for ${provider}: HTTP ${res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}

export async function getErpOAuthToken(connectionId: string): Promise<string> {
  const row = await prisma.erpOAuthToken.findUnique({ where: { connectionId } });
  if (!row) throw new Error(`No OAuth token for connection ${connectionId}`);

  const fiveMinFromNow = addSeconds(new Date(), 300);
  if (row.expiresAt > fiveMinFromNow) {
    return decryptHoldedSecret(row.accessTokenEnc);
  }

  if (!row.refreshTokenEnc) {
    throw new Error(`Access token expired and no refresh token for connection ${connectionId}`);
  }

  const refreshToken = decryptHoldedSecret(row.refreshTokenEnc);
  const refreshed = await doRefresh(row.provider, refreshToken);

  await prisma.erpOAuthToken.update({
    where: { connectionId },
    data: {
      accessTokenEnc: encryptHoldedSecret(refreshed.access_token),
      expiresAt: addSeconds(new Date(), refreshed.expires_in ?? 3600),
      ...(refreshed.refresh_token
        ? { refreshTokenEnc: encryptHoldedSecret(refreshed.refresh_token) }
        : {}),
    },
  });

  return refreshed.access_token;
}

export async function saveErpOAuthToken(input: {
  connectionId: string;
  tenantId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
}) {
  await prisma.erpOAuthToken.upsert({
    where: { connectionId: input.connectionId },
    create: {
      connectionId: input.connectionId,
      tenantId: input.tenantId,
      provider: input.provider,
      accessTokenEnc: encryptHoldedSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken ? encryptHoldedSecret(input.refreshToken) : null,
      expiresAt: addSeconds(new Date(), input.expiresIn),
      scope: input.scope ?? '',
    },
    update: {
      accessTokenEnc: encryptHoldedSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken ? encryptHoldedSecret(input.refreshToken) : undefined,
      expiresAt: addSeconds(new Date(), input.expiresIn),
      scope: input.scope ?? '',
    },
  });
}

export async function deleteErpOAuthToken(connectionId: string) {
  await prisma.erpOAuthToken.deleteMany({ where: { connectionId } });
}
