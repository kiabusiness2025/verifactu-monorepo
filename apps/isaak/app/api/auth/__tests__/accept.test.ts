/** @jest-environment node */

/**
 * Tests for GET /api/auth/accept — cross-domain session handoff.
 *
 * Verifies:
 * - Valid JWT → sets __session cookie and redirects to `next`
 * - safeNext() security: blocks open-redirect attempts
 * - Invalid/missing token → redirects to /auth
 * - Missing uid or tenantId in payload → redirects to /auth
 */

const verifyMock = jest.fn();
const buildCookieMock = jest.fn();

jest.mock('@/app/lib/session', () => ({
  verifySessionTokenFromEnv: (...args: unknown[]) => verifyMock(...args),
  buildSessionCookieOptions: (...args: unknown[]) => buildCookieMock(...args),
}));

import { NextRequest } from 'next/server';
import { GET } from '../accept/route';

const BASE = 'https://isaak.app';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL(`${BASE}/api/auth/accept`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const VALID_PAYLOAD = { uid: 'firebase-uid-1', tenantId: 'tenant-abc' };

const COOKIE_OPTS = {
  name: '__session',
  value: 'tok',
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

beforeEach(() => {
  jest.clearAllMocks();
  buildCookieMock.mockReturnValue(COOKIE_OPTS);
  process.env.NEXT_PUBLIC_ISAAK_SITE_URL = BASE;
});

// ── Missing token ──────────────────────────────────────────────────────────────

describe('missing or empty token', () => {
  it('redirects to /auth when _t param is absent', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth');
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('redirects to /auth when _t is whitespace only', async () => {
    const res = await GET(makeRequest({ _t: '   ' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth');
  });
});

// ── Invalid token ──────────────────────────────────────────────────────────────

describe('invalid / unverifiable token', () => {
  it('redirects to /auth when verifySessionTokenFromEnv rejects', async () => {
    verifyMock.mockRejectedValue(new Error('bad signature'));
    const res = await GET(makeRequest({ _t: 'bad.token.here' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth');
  });

  it('redirects to /auth when verifySessionTokenFromEnv returns null', async () => {
    verifyMock.mockResolvedValue(null);
    const res = await GET(makeRequest({ _t: 'some-token' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth');
  });

  it('redirects to /auth when payload has no uid', async () => {
    verifyMock.mockResolvedValue({ tenantId: 'tenant-abc' });
    const res = await GET(makeRequest({ _t: 'tok' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth');
  });

  it('redirects to /auth when payload has no tenantId', async () => {
    verifyMock.mockResolvedValue({ uid: 'firebase-uid' });
    const res = await GET(makeRequest({ _t: 'tok' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth');
  });
});

// ── Valid token — redirect destination ────────────────────────────────────────

describe('valid token — redirect target', () => {
  beforeEach(() => {
    verifyMock.mockResolvedValue(VALID_PAYLOAD);
  });

  it('redirects to /chat when next is absent', async () => {
    const res = await GET(makeRequest({ _t: 'valid-token' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/chat');
  });

  it('redirects to relative path when next starts with /', async () => {
    const res = await GET(makeRequest({ _t: 'valid-token', next: '/resumen' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/resumen');
  });

  it('strips to pathname for absolute same-origin URL (stays on same origin)', async () => {
    const res = await GET(makeRequest({ _t: 'valid-token', next: `${BASE}/fiscal?tab=modelos` }));
    expect(res.status).toBe(307);
    const loc = res.headers.get('location') ?? '';
    expect(loc).toContain('/fiscal');
    // NextResponse.redirect always produces absolute URLs; confirm it stays on same origin
    expect(new URL(loc).origin).toBe(BASE);
  });
});

// ── safeNext() — open-redirect protection ─────────────────────────────────────

describe('safeNext — open redirect protection', () => {
  beforeEach(() => {
    verifyMock.mockResolvedValue(VALID_PAYLOAD);
  });

  it('falls back to /chat for protocol-relative URL (//evil.com)', async () => {
    const res = await GET(makeRequest({ _t: 'tok', next: '//evil.com/steal' }));
    expect(res.headers.get('location')).toContain('/chat');
  });

  it('falls back to /chat for external absolute URL', async () => {
    const res = await GET(makeRequest({ _t: 'tok', next: 'https://evil.com/phish' }));
    expect(res.headers.get('location')).toContain('/chat');
  });

  it('falls back to /chat for javascript: URL', async () => {
    const res = await GET(makeRequest({ _t: 'tok', next: 'javascript:alert(1)' }));
    expect(res.headers.get('location')).toContain('/chat');
  });

  it('allows relative paths with query strings', async () => {
    const res = await GET(makeRequest({ _t: 'tok', next: '/chat?source=onboarding' }));
    const loc = res.headers.get('location') ?? '';
    expect(loc).toContain('/chat');
    expect(loc).toContain('source=onboarding');
  });
});

// ── Cookie is set on successful handoff ───────────────────────────────────────

describe('cookie on successful handoff', () => {
  it('sets __session cookie via buildSessionCookieOptions', async () => {
    verifyMock.mockResolvedValue(VALID_PAYLOAD);
    const res = await GET(makeRequest({ _t: 'my-valid-token', next: '/chat' }));
    expect(buildCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'my-valid-token' })
    );
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('__session');
  });

  it('binds cookie to current origin (domainEnv: null)', async () => {
    verifyMock.mockResolvedValue(VALID_PAYLOAD);
    await GET(makeRequest({ _t: 'tok' }));
    expect(buildCookieMock).toHaveBeenCalledWith(expect.objectContaining({ domainEnv: null }));
  });

  it('uses SameSite=lax for cross-domain cookie', async () => {
    verifyMock.mockResolvedValue(VALID_PAYLOAD);
    await GET(makeRequest({ _t: 'tok' }));
    expect(buildCookieMock).toHaveBeenCalledWith(expect.objectContaining({ sameSiteEnv: 'lax' }));
  });

  it('sets 30-day maxAge', async () => {
    verifyMock.mockResolvedValue(VALID_PAYLOAD);
    await GET(makeRequest({ _t: 'tok' }));
    expect(buildCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxAgeSeconds: 60 * 60 * 24 * 30 })
    );
  });
});
