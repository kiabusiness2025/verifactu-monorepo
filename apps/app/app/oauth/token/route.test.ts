/** @jest-environment node */

jest.mock('@/lib/db', () => {
  const usedCodes = new Set<string>();
  const query = jest.fn(async (text: string, params?: unknown[]) => {
    if (text.includes('CREATE TABLE IF NOT EXISTS oauth_authorization_code_redemptions')) {
      return [];
    }

    if (
      text.includes(
        'CREATE INDEX IF NOT EXISTS oauth_authorization_code_redemptions_expires_at_idx'
      )
    ) {
      return [];
    }

    if (text.includes('INSERT INTO oauth_authorization_code_redemptions')) {
      const codeIdHash = typeof params?.[0] === 'string' ? params[0] : null;
      if (!codeIdHash || usedCodes.has(codeIdHash)) {
        return [];
      }

      usedCodes.add(codeIdHash);
      return [{ code_id_hash: codeIdHash }];
    }

    return [];
  });

  return {
    query,
    one: jest.fn(async (text: string, params?: unknown[]) => {
      const rows = await query(text, params);
      return rows[0] ?? null;
    }),
    tx: jest.fn(),
    __usedCodes: usedCodes,
  };
});

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/src/server/tenant/resolveActiveTenant', () => ({
  resolveActiveTenant: jest.fn(),
}));

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
  getLandingUrl: jest.fn(() => 'https://verifactu.business'),
  signSessionToken: jest.fn(async ({ payload }: { payload: Record<string, unknown> }) =>
    Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  ),
  verifySessionToken: jest.fn(async (token: string) => {
    try {
      return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }),
}));

import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { mintAuthorizationCode, mintRefreshToken } from '@/lib/oauth/mcp';

function buildPkceChallenge(codeVerifier: string) {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

function createTokenRequest(body: Record<string, unknown>) {
  return new NextRequest('https://app.verifactu.business/oauth/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /oauth/token', () => {
  const previousSessionSecret = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
  });

  beforeEach(() => {
    const dbModule = jest.requireMock('@/lib/db') as { __usedCodes: Set<string>; query: jest.Mock };
    dbModule.__usedCodes.clear();
    dbModule.query.mockClear();
  });

  afterAll(() => {
    process.env.SESSION_SECRET = previousSessionSecret;
  });

  it('redeems a valid authorization code only once', async () => {
    const codeVerifier = 'verifier-value-abcdefghijklmnopqrstuvwxyz-123456789';
    const codeChallenge = buildPkceChallenge(codeVerifier);
    const code = await mintAuthorizationCode({
      type: 'mcp_auth_code',
      clientId: 'openai-chatgpt-test',
      redirectUri: 'https://chat.openai.com/aip/oauth/callback',
      scope: 'mcp.read holded.invoices.read',
      codeChallenge,
      codeChallengeMethod: 'S256',
      resource: 'https://app.verifactu.business/api/mcp/holded',
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const firstResponse = await POST(
      createTokenRequest({
        grant_type: 'authorization_code',
        code,
        client_id: 'openai-chatgpt-test',
        redirect_uri: 'https://chat.openai.com/aip/oauth/callback',
        code_verifier: codeVerifier,
      })
    );
    const firstPayload = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstPayload.token_type).toBe('Bearer');
    expect(typeof firstPayload.access_token).toBe('string');

    const secondResponse = await POST(
      createTokenRequest({
        grant_type: 'authorization_code',
        code,
        client_id: 'openai-chatgpt-test',
        redirect_uri: 'https://chat.openai.com/aip/oauth/callback',
        code_verifier: codeVerifier,
      })
    );
    const secondPayload = await secondResponse.json();

    expect(secondResponse.status).toBe(400);
    expect(secondPayload).toEqual({ error: 'invalid_grant' });
  });

  it('issues a refresh_token alongside the access_token on code exchange', async () => {
    const codeVerifier = 'verifier-value-abcdefghijklmnopqrstuvwxyz-123456789';
    const codeChallenge = buildPkceChallenge(codeVerifier);
    const code = await mintAuthorizationCode({
      type: 'mcp_auth_code',
      clientId: 'openai-chatgpt-test',
      redirectUri: 'https://chat.openai.com/aip/oauth/callback',
      scope: 'mcp.read holded.invoices.read',
      codeChallenge,
      codeChallengeMethod: 'S256',
      resource: 'https://app.verifactu.business/api/mcp/holded',
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const response = await POST(
      createTokenRequest({
        grant_type: 'authorization_code',
        code,
        client_id: 'openai-chatgpt-test',
        redirect_uri: 'https://chat.openai.com/aip/oauth/callback',
        code_verifier: codeVerifier,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(typeof payload.access_token).toBe('string');
    expect(typeof payload.refresh_token).toBe('string');
    expect(payload.token_type).toBe('Bearer');
    expect(payload.expires_in).toBe(86400);
  });

  it('issues new tokens on a valid refresh_token grant', async () => {
    const refreshToken = await mintRefreshToken({
      clientId: 'openai-chatgpt-test',
      scope: 'mcp.read holded.invoices.read',
      resource: 'https://app.verifactu.business/api/mcp/holded',
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const response = await POST(
      createTokenRequest({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'openai-chatgpt-test',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(typeof payload.access_token).toBe('string');
    expect(typeof payload.refresh_token).toBe('string');
    expect(payload.token_type).toBe('Bearer');
    expect(payload.scope).toBe('mcp.read holded.invoices.read');
  });

  it('rejects refresh_token grant when client_id does not match', async () => {
    const refreshToken = await mintRefreshToken({
      clientId: 'openai-chatgpt-test',
      scope: 'mcp.read',
      resource: 'https://app.verifactu.business/api/mcp/holded',
      uid: 'user-1',
      email: null,
      name: null,
      tenantId: 'tenant-1',
    });

    const response = await POST(
      createTokenRequest({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'different-client',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'invalid_grant' });
  });

  it('rejects refresh_token grant with a malformed token', async () => {
    const response = await POST(
      createTokenRequest({
        grant_type: 'refresh_token',
        refresh_token: 'not-a-valid-jwt',
        client_id: 'openai-chatgpt-test',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'invalid_grant' });
  });

  it('rejects token exchange requests without a valid code_verifier', async () => {
    const codeVerifier = 'verifier-value-abcdefghijklmnopqrstuvwxyz-123456789';
    const codeChallenge = buildPkceChallenge(codeVerifier);
    const code = await mintAuthorizationCode({
      type: 'mcp_auth_code',
      clientId: 'openai-chatgpt-test',
      redirectUri: 'https://chat.openai.com/aip/oauth/callback',
      scope: 'mcp.read holded.invoices.read',
      codeChallenge,
      codeChallengeMethod: 'S256',
      resource: 'https://app.verifactu.business/api/mcp/holded',
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const response = await POST(
      createTokenRequest({
        grant_type: 'authorization_code',
        code,
        client_id: 'openai-chatgpt-test',
        redirect_uri: 'https://chat.openai.com/aip/oauth/callback',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'invalid_request' });
  });
});
