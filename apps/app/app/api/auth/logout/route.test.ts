/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  buildSessionCookieOptions: jest.fn(() => ({
    name: '__session',
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    domain: '.verifactu.business',
    maxAge: 0,
  })),
}));

import { buildSessionCookieOptions } from '@verifactu/utils';
import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('clears the shared session cookie for the current app host', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/api/auth/logout', {
        method: 'POST',
        headers: { host: 'app.verifactu.business' },
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(buildSessionCookieOptions).toHaveBeenCalledWith({
      url: 'https://app.verifactu.business/api/auth/logout',
      host: 'app.verifactu.business',
      domainEnv: process.env.SESSION_COOKIE_DOMAIN,
      secureEnv: process.env.SESSION_COOKIE_SECURE,
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE,
      value: '',
      maxAgeSeconds: 0,
    });
  });
});
