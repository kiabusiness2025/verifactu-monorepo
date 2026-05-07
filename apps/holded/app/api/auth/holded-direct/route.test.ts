/** @jest-environment node */

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
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { signSessionToken } from '@/app/lib/session';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

function buildRequest(body: unknown) {
  return new NextRequest('https://holded.verifactu.business/api/auth/holded-direct', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'holded.verifactu.business' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function fetchOk(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { 'content-type': 'application/json' },
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

describe('POST /api/auth/holded-direct (F2.2 wrapper)', () => {
  it('rechaza body sin email/apiKey con MISSING_FIELDS sin llamar a F1', async () => {
    const response = await POST(buildRequest({ acceptedTerms: true, acceptedPrivacy: true }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({ error: 'MISSING_FIELDS' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza si T&C/privacidad no aceptados con TERMS_NOT_ACCEPTED', async () => {
    const response = await POST(
      buildRequest({
        email: 'a@b.com',
        apiKey: 'k1234',
        acceptedTerms: false,
        acceptedPrivacy: true,
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({ error: 'TERMS_NOT_ACCEPTED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama al endpoint F1 con channel=mobile y traduce reason invalid_api_key', async () => {
    fetchMock.mockResolvedValue(
      fetchOk(
        {
          ok: false,
          stage: 'probe',
          reason: 'invalid_api_key',
          detail: 'Holded API key validation failed',
        },
        422
      )
    );

    const response = await POST(
      buildRequest({
        email: 'demo@example.com',
        apiKey: 'badkey',
        acceptedTerms: true,
        acceptedPrivacy: true,
        next: 'https://holded.verifactu.business/dashboard?source=test',
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    const json = await response.json();
    expect(json).toEqual({ error: 'INVALID_API_KEY' });
    expect(signSessionToken).not.toHaveBeenCalled();
  });

  it('traduce probe_failed (red caída) a PROBE_ERROR 502', async () => {
    fetchMock.mockResolvedValue(
      fetchOk({ ok: false, stage: 'probe', reason: 'probe_failed', detail: 'timeout' }, 422)
    );

    const response = await POST(
      buildRequest({
        email: 'demo@example.com',
        apiKey: 'apikey',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json).toEqual({ error: 'PROBE_ERROR' });
  });

  it('traduce persist_failed a DB_ERROR 500', async () => {
    fetchMock.mockResolvedValue(
      fetchOk({ ok: false, stage: 'persist', reason: 'persist_failed', detail: 'db down' }, 500)
    );

    const response = await POST(
      buildRequest({
        email: 'demo@example.com',
        apiKey: 'apikey',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toEqual({ error: 'DB_ERROR' });
  });

  it('si fetch al endpoint F1 lanza, devuelve PROBE_ERROR 502', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await POST(
      buildRequest({
        email: 'demo@example.com',
        apiKey: 'apikey',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json).toEqual({ error: 'PROBE_ERROR' });
    expect(signSessionToken).not.toHaveBeenCalled();
  });

  it('happy path: mintea cookie y devuelve {ok, redirectUrl}', async () => {
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
      buildRequest({
        email: 'Demo@Example.com',
        apiKey: 'apikey',
        acceptedTerms: true,
        acceptedPrivacy: true,
        next: 'https://holded.verifactu.business/dashboard?source=mobile',
      })
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
      buildRequest({
        email: 'demo@example.com',
        apiKey: 'k',
        acceptedTerms: true,
        acceptedPrivacy: true,
        next: 'https://evil.example.com/exfil',
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.redirectUrl).toBe('/dashboard');
  });
});
