/** @jest-environment node */

/**
 * Tests del wrapper /api/auth/holded-direct.
 *
 * F2.2 — wrapper que llama al endpoint F1 (upsert-from-key) y mintea cookie
 *   de sesion sobre `.verifactu.business`.
 *
 * Autentificacion (2026-05-08): el email se obtiene de la session cookie
 *   firmada (SESSION_COOKIE_NAME) minteada por /api/auth/session tras Google
 *   OAuth o magic link de Firebase. Sin session valida → NOT_AUTHENTICATED.
 */

jest.mock('@/app/lib/holded-navigation', () => ({
  APP_PUBLIC_URL: 'https://app.verifactu.business',
  sanitizeHoldedReturnTarget: jest.fn((next?: string, fallback = '/dashboard') => {
    if (typeof next === 'string' && next.startsWith('https://holded.verifactu.business')) {
      return next;
    }
    return fallback;
  }),
}));

jest.mock('@/app/lib/session', () => ({
  SESSION_COOKIE_NAME: 'verifactu_session',
  buildSessionCookieOptions: jest.fn((input: { value: string; maxAgeSeconds: number }) => ({
    value: input.value,
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    domain: '.verifactu.business',
    maxAge: input.maxAgeSeconds,
  })),
  readSessionSecret: jest.fn(() => 'test-secret'),
  signSessionToken: jest.fn(async () => 'jwt-token'),
  verifySessionToken: jest.fn(),
}));

import { signSessionToken, verifySessionToken } from '@/app/lib/session';
import { NextRequest } from 'next/server';
import { POST } from './route';

const verifySessionMock = verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;
const fetchMock = jest.fn();
const originalFetch = global.fetch;

function buildRequest(body: unknown, opts: { withSessionCookie?: boolean } = {}) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    host: 'holded.verifactu.business',
  };
  if (opts.withSessionCookie) {
    headers.cookie = 'verifactu_session=signed-jwt';
  }
  return new NextRequest('https://holded.verifactu.business/api/auth/holded-direct', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function fetchOk(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockSessionEmail(email: string) {
  verifySessionMock.mockResolvedValueOnce({
    uid: 'test-uid',
    email,
    tenantId: undefined,
    role: 'member',
    roles: [],
    tenants: [],
    ver: 1,
    rememberDevice: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('POST /api/auth/holded-direct — autentificacion via session cookie', () => {
  it('rechaza con NOT_AUTHENTICATED 401 si no hay session cookie', async () => {
    const response = await POST(
      buildRequest({
        apiKey: 'a'.repeat(32),
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: 'NOT_AUTHENTICATED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza con NOT_AUTHENTICATED si la session cookie es invalida', async () => {
    verifySessionMock.mockRejectedValueOnce(new Error('invalid token'));
    const response = await POST(
      buildRequest(
        { apiKey: 'a'.repeat(32), acceptedTerms: true, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'NOT_AUTHENTICATED' });
  });

  it('rechaza con NOT_AUTHENTICATED si la session no tiene email', async () => {
    verifySessionMock.mockResolvedValueOnce({
      uid: 'test-uid',
      email: null,
      role: 'member',
      roles: [],
      tenants: [],
      ver: 1,
      rememberDevice: false,
    });
    const response = await POST(
      buildRequest(
        { apiKey: 'a'.repeat(32), acceptedTerms: true, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'NOT_AUTHENTICATED' });
  });

  it('lee el email de la session cookie — no del body', async () => {
    mockSessionEmail('real@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({
        ok: true,
        userId: 'u',
        tenantId: 't',
        connectionId: 'c',
        status: 'connected',
        legalAcceptedAt: '2026-05-08T12:01:00.000Z',
      })
    );

    await POST(
      buildRequest(
        { apiKey: 'a'.repeat(32), acceptedTerms: true, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.personalEmail).toBe('real@example.com');
  });
});

describe('POST /api/auth/holded-direct — F2.2 wrapper', () => {
  it('rechaza body sin apiKey con MISSING_FIELDS sin llamar a F1', async () => {
    mockSessionEmail('demo@example.com');
    const response = await POST(
      buildRequest({ acceptedTerms: true, acceptedPrivacy: true }, { withSessionCookie: true })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'MISSING_FIELDS' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza si T&C/privacidad no aceptados con TERMS_NOT_ACCEPTED', async () => {
    mockSessionEmail('demo@example.com');
    const response = await POST(
      buildRequest(
        { apiKey: 'k1234', acceptedTerms: false, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'TERMS_NOT_ACCEPTED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama al endpoint F1 con channel=mobile y traduce reason invalid_api_key', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({ ok: false, stage: 'probe', reason: 'invalid_api_key', detail: 'failed' }, 422)
    );

    const response = await POST(
      buildRequest(
        {
          apiKey: 'badkey',
          acceptedTerms: true,
          acceptedPrivacy: true,
          next: 'https://holded.verifactu.business/dashboard?source=test',
        },
        { withSessionCookie: true }
      )
    );

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe(
      'https://app.verifactu.business/api/integrations/holded/upsert-from-key'
    );
    const sentBody = JSON.parse((calledInit as { body: string }).body);
    expect(sentBody).toMatchObject({
      personalEmail: 'demo@example.com',
      holdedApiKey: 'badkey',
      channel: 'mobile',
      source: 'chatgpt_mobile_form',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'INVALID_API_KEY' });
    expect(signSessionToken).not.toHaveBeenCalled();
  });

  it('traduce probe_failed a PROBE_ERROR 502', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({ ok: false, stage: 'probe', reason: 'probe_failed', detail: 'timeout' }, 422)
    );

    const response = await POST(
      buildRequest(
        { apiKey: 'apikey', acceptedTerms: true, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'PROBE_ERROR' });
  });

  it('traduce persist_failed a DB_ERROR 500', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({ ok: false, stage: 'persist', reason: 'persist_failed', detail: 'db down' }, 500)
    );

    const response = await POST(
      buildRequest(
        { apiKey: 'apikey', acceptedTerms: true, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'DB_ERROR' });
  });

  it('si fetch al endpoint F1 lanza, devuelve PROBE_ERROR 502', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await POST(
      buildRequest(
        { apiKey: 'apikey', acceptedTerms: true, acceptedPrivacy: true },
        { withSessionCookie: true }
      )
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'PROBE_ERROR' });
    expect(signSessionToken).not.toHaveBeenCalled();
  });

  it('happy path: mintea session cookie y devuelve {ok, redirectUrl}', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({
        ok: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        connectionId: 'conn-1',
        status: 'connected',
        legalAcceptedAt: '2026-05-06T12:00:00.000Z',
        created: { user: true, tenant: true, membership: true },
      })
    );

    const response = await POST(
      buildRequest(
        {
          apiKey: 'apikey',
          acceptedTerms: true,
          acceptedPrivacy: true,
          next: 'https://holded.verifactu.business/dashboard?source=mobile',
        },
        { withSessionCookie: true }
      )
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.redirectUrl).toBe('https://holded.verifactu.business/dashboard?source=mobile');

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          uid: 'user-1',
          email: 'demo@example.com',
          tenantId: 'tenant-1',
          role: 'owner',
          tenants: ['tenant-1'],
        }),
        secret: 'test-secret',
      })
    );

    const cookieHeader = response.headers.get('set-cookie') ?? '';
    expect(cookieHeader).toContain('verifactu_session=jwt-token');
    expect(cookieHeader.toLowerCase()).toContain('httponly');
    expect(cookieHeader.toLowerCase()).toContain('secure');
    expect(cookieHeader.toLowerCase()).toContain('samesite=none');
    expect(cookieHeader).toContain('Domain=.verifactu.business');
  });

  it('cae en redirectUrl=/dashboard si next no apunta al dominio holded', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({
        ok: true,
        userId: 'u',
        tenantId: 't',
        connectionId: 'c',
        status: 'connected',
        legalAcceptedAt: '2026-05-06T12:00:00.000Z',
        created: { user: false, tenant: false, membership: false },
      })
    );

    const response = await POST(
      buildRequest(
        {
          apiKey: 'k',
          acceptedTerms: true,
          acceptedPrivacy: true,
          next: 'https://evil.example.com/exfil',
        },
        { withSessionCookie: true }
      )
    );

    expect(response.status).toBe(200);
    expect((await response.json()).redirectUrl).toBe('/dashboard');
  });

  it('inyecta flags OAuth cuando next es /oauth/authorize', async () => {
    mockSessionEmail('demo@example.com');
    fetchMock.mockResolvedValue(
      fetchOk({
        ok: true,
        userId: 'u',
        tenantId: 'tenant-xyz',
        connectionId: 'conn-abc',
        status: 'connected',
        legalAcceptedAt: '2026-05-08T12:00:00.000Z',
      })
    );

    const response = await POST(
      buildRequest(
        {
          apiKey: 'apikey',
          acceptedTerms: true,
          acceptedPrivacy: true,
          next: 'https://holded.verifactu.business/oauth/authorize?client_id=x&state=s1',
        },
        { withSessionCookie: true }
      )
    );

    expect(response.status).toBe(200);
    const url = new URL((await response.json()).redirectUrl);
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('connection_confirmed')).toBe('1');
    expect(url.searchParams.get('connected_provider_account_id')).toBe('conn-abc');
    expect(url.searchParams.get('tenant_id')).toBe('tenant-xyz');
  });
});
