/** @jest-environment node */

/**
 * Tests para POST /api/auth/otp/verify.
 *
 * Cubre:
 *  - Validación de token JWT (jose) y código de 6 dígitos
 *  - HMAC timing-safe compare entre OTP recibido y stored
 *  - Mint de sesión `verifactu_session` de 30 min con email del JWT
 *  - Rate limit por IP (10/15 min)
 *  - Errores: secret no disponible (503), token expirado (400), código wrong (400)
 *
 * jose es ESM-only — se mockea completamente para que jest (CJS) pueda cargar
 * la ruta. La lógica HMAC real (crypto nativo) se ejercita sin mock.
 */

// jose mock: must come before any import so jest hoisting works
jest.mock('jose', () => ({
  __esModule: true,
  jwtVerify: jest.fn(),
}));

jest.mock('@/app/lib/session', () => ({
  SESSION_COOKIE_NAME: 'verifactu_session',
  buildSessionCookieOptions: jest.fn(),
  readSessionSecret: jest.fn(),
  signSessionToken: jest.fn(),
}));

import crypto from 'node:crypto';
import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { buildSessionCookieOptions, readSessionSecret, signSessionToken } from '@/app/lib/session';

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const readSecretMock = readSessionSecret as jest.MockedFunction<typeof readSessionSecret>;
const signSessionMock = signSessionToken as jest.MockedFunction<typeof signSessionToken>;
const buildCookieMock = buildSessionCookieOptions as jest.MockedFunction<
  typeof buildSessionCookieOptions
>;

const TEST_SECRET = 'test-session-secret-123456789012';

function computeHmac(secret: string, email: string, otp: string): string {
  return crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');
}

/**
 * Configures jwtVerify mock to return a valid payload for the given email+otp.
 * Returns a dummy token string (actual value irrelevant since jwtVerify is mocked).
 */
function setupValidToken(email: string, otp: string, secret = TEST_SECRET): string {
  const hmac = computeHmac(secret, email, otp);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockJwtVerify.mockResolvedValueOnce({ payload: { email, h: hmac } } as any);
  return 'dummy-token';
}

function buildRequest(body: unknown, ip = `5.5.5.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest('https://holded.verifactu.business/api/auth/otp/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      host: 'holded.verifactu.business',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  // resetAllMocks also flushes mockOnce queues — avoids stale mocks bleeding
  // into tests where jwtVerify is never reached (e.g. early-validation 400s).
  jest.resetAllMocks();
  readSecretMock.mockReturnValue(TEST_SECRET);
  signSessionMock.mockResolvedValue('minted-session-jwt');
  buildCookieMock.mockImplementation((input) => ({
    value: input.value,
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    domain: '.verifactu.business',
    maxAge: input.maxAgeSeconds,
  }));
});

describe('POST /api/auth/otp/verify', () => {
  it('rechaza body JSON inválido con 400', async () => {
    const res = await POST(buildRequest('not-json'));
    expect(res.status).toBe(400);
  });

  it('rechaza token vacío o OTP no de 6 dígitos con 400 (sin llamar jwtVerify)', async () => {
    // token empty → fails validation before jwtVerify
    const res1 = await POST(buildRequest({ token: '', otp: '123456' }));
    expect(res1.status).toBe(400);

    // otp '12345' (5 digits) → fails validation before jwtVerify
    const res2 = await POST(buildRequest({ token: 'any-token', otp: '12345' }));
    expect(res2.status).toBe(400);

    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('devuelve 503 cuando readSessionSecret lanza', async () => {
    readSecretMock.mockImplementationOnce(() => {
      throw new Error('not configured');
    });
    const res = await POST(buildRequest({ token: 'any', otp: '123456' }));
    expect(res.status).toBe(503);
  });

  it('rechaza token expirado con 400 y mensaje claro', async () => {
    mockJwtVerify.mockRejectedValueOnce(
      new Error('JWTExpired: "exp" claim timestamp check failed')
    );
    const res = await POST(buildRequest({ token: 'expired-token', otp: '123456' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/caducado|expirado|válido/i);
  });

  it('rechaza token firmado con secret distinto con 400', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('JWTSignatureVerificationFailed'));
    const res = await POST(buildRequest({ token: 'bad-sig-token', otp: '123456' }));
    expect(res.status).toBe(400);
  });

  it('rechaza código OTP incorrecto con 400 y NO mintea sesión', async () => {
    const tok = setupValidToken('user@example.com', '111111');
    const res = await POST(buildRequest({ token: tok, otp: '222222' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/incorrecto/i);
    expect(signSessionMock).not.toHaveBeenCalled();
  });

  it('acepta OTP correcto, mintea sesión y setea cookie .verifactu.business', async () => {
    const tok = setupValidToken('user@example.com', '654321');
    const res = await POST(buildRequest({ token: tok, otp: '654321' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.email).toBe('user@example.com');

    expect(signSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: TEST_SECRET,
        expiresIn: '30m',
        payload: expect.objectContaining({
          email: 'user@example.com',
          uid: 'otp:user@example.com',
          ver: 1,
          rememberDevice: true,
        }),
      })
    );

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/verifactu_session=minted-session-jwt/);
    expect(setCookie).toMatch(/Max-Age=1800/i);
  });

  it('aplica rate limit (10 intentos / 15 min por IP) y devuelve 429 en el 11º', async () => {
    const ip = '7.7.7.7';
    for (let i = 0; i < 10; i++) {
      // Use wrong OTP each time so the HMAC fails → 400, but attempt is counted
      const tok = setupValidToken('user@example.com', '111111');
      const res = await POST(buildRequest({ token: tok, otp: '222222' }, ip));
      expect([200, 400]).toContain(res.status);
    }
    const blocked = await POST(buildRequest({ token: 'tok', otp: '222222' }, ip));
    expect(blocked.status).toBe(429);
  });

  it('normaliza OTP eliminando caracteres no numéricos antes del compare', async () => {
    // Route strips non-digits: '987-654' → '987654'
    const tok = setupValidToken('user@example.com', '987654');
    const res = await POST(buildRequest({ token: tok, otp: '987-654' }));
    expect(res.status).toBe(200);
  });
});
