/** @jest-environment node */

/**
 * Tests for POST /api/auth/logout — session cookie deletion.
 *
 * Verifies:
 * - Returns {ok: true}
 * - Sets __session cookie with maxAge=0 (deletion)
 * - Cookie uses the shared domain (.verifactu.business by default)
 * - Respects SESSION_COOKIE_DOMAIN override
 */

const buildCookieMock = jest.fn();

jest.mock('@/app/lib/session', () => ({
  buildSessionCookieOptions: (...args: unknown[]) => buildCookieMock(...args),
}));

import { POST } from '../logout/route';

const CLEARED_COOKIE = {
  name: '__session',
  value: '',
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
  domain: '.verifactu.business',
  maxAge: 0,
};

function makeRequest(url = 'https://isaak.verifactu.business/api/auth/logout') {
  return new Request(url, { method: 'POST' });
}

beforeEach(() => {
  jest.clearAllMocks();
  buildCookieMock.mockReturnValue(CLEARED_COOKIE);
  delete process.env.SESSION_COOKIE_DOMAIN;
  delete process.env.SESSION_COOKIE_SECURE;
  delete process.env.SESSION_COOKIE_SAMESITE;
});

describe('POST /api/auth/logout', () => {
  it('returns HTTP 200 with {ok: true}', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('clears session via buildSessionCookieOptions with value="" and maxAge=0', async () => {
    await POST(makeRequest());
    expect(buildCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: '', maxAgeSeconds: 0 })
    );
  });

  it('uses .verifactu.business as default shared domain', async () => {
    await POST(makeRequest());
    expect(buildCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({ domainEnv: '.verifactu.business' })
    );
  });

  it('respects SESSION_COOKIE_DOMAIN env var override', async () => {
    process.env.SESSION_COOKIE_DOMAIN = '.custom.example.com';
    await POST(makeRequest());
    expect(buildCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({ domainEnv: '.custom.example.com' })
    );
  });

  it('sets the __session cookie on the response', async () => {
    const res = await POST(makeRequest());
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('__session');
  });
});
