/** @jest-environment node */

/**
 * Tests para POST /api/auth/magic-link.
 *
 * Cubre:
 *  - Validación de email y continueUrl (allow-list de orígenes)
 *  - Rate limit por IP (5/hora)
 *  - Generación de Firebase sign-in link + OTP de 6 dígitos
 *  - Envío del correo vía Resend (fetch a api.resend.com)
 *  - Manejo de errores: Firebase Admin no configurado, RESEND_API_KEY missing,
 *    Resend 4xx/5xx → 502, JSON inválido → 400
 */

import { NextRequest } from 'next/server';

// jose is ESM-only — mock it so jest (CJS) can load the route without SyntaxError
jest.mock('jose', () => ({
  __esModule: true,
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-otp-jwt-token-abcdefghijklmnopqrstu'),
  })),
}));

// Mock Firebase Admin SDK *antes* de importar la ruta
const mockGenerateLink = jest.fn();
jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    apps: [],
    initializeApp: jest.fn(() => ({ name: 'holded-magic-link' })),
    auth: jest.fn(() => ({ generateSignInWithEmailLink: mockGenerateLink })),
    credential: { cert: jest.fn(() => ({})) },
  },
}));

const ENV_DEFAULTS = {
  FIREBASE_ADMIN_PROJECT_ID: 'demo-project',
  FIREBASE_ADMIN_CLIENT_EMAIL: 'sa@demo-project.iam.gserviceaccount.com',
  FIREBASE_ADMIN_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n',
  RESEND_API_KEY: 'resend-test-key',
  RESEND_FROM_HOLDED: 'Holded <no-reply@holded.verifactu.business>',
  SESSION_SECRET: 'test-session-secret-123456789012',
};

const originalEnv = { ...process.env };
const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv, ...ENV_DEFAULTS };
  fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  global.fetch = fetchMock as unknown as typeof fetch;
  mockGenerateLink.mockResolvedValue(
    'https://holded.verifactu.business/auth/holded-direct?oobCode=ABC&apiKey=xyz'
  );
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
});

function buildRequest(body: unknown, ip = `1.2.3.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest('https://holded.verifactu.business/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      host: 'holded.verifactu.business',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/auth/magic-link', () => {
  it('rechaza body JSON inválido con 400', async () => {
    const { POST } = await import('./route');
    const req = buildRequest('not-json');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/cuerpo/i);
  });

  it('rechaza email mal formado con 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({
        email: 'no-es-email',
        continueUrl: 'https://holded.verifactu.business/auth/holded-direct',
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/inválido/i);
  });

  it('rechaza continueUrl ausente con 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/url/i);
  });

  it('rechaza continueUrl con origen no permitido con 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({ email: 'user@example.com', continueUrl: 'https://evil.example.com/phish' })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/permitida/i);
  });

  it('acepta orígenes en la allow-list (holded, claude, app, localhost)', async () => {
    const { POST } = await import('./route');
    const allowed = [
      'https://holded.verifactu.business/x',
      'https://claude.verifactu.business/x',
      'https://app.verifactu.business/x',
      'http://localhost:3000/x',
    ];
    for (const continueUrl of allowed) {
      const res = await POST(buildRequest({ email: 'user@example.com', continueUrl }));
      expect(res.status).toBe(200);
    }
  });

  it('devuelve 503 cuando faltan FIREBASE_ADMIN_* env vars', async () => {
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({
        email: 'user@example.com',
        continueUrl: 'https://holded.verifactu.business/x',
      })
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/autenticación|disponible/i);
  });

  it('devuelve 503 cuando falta RESEND_API_KEY', async () => {
    delete process.env.RESEND_API_KEY;
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({
        email: 'user@example.com',
        continueUrl: 'https://holded.verifactu.business/x',
      })
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/correo|disponible/i);
  });

  it('genera Firebase link, envía Resend y devuelve otpToken', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({
        email: 'user@example.com',
        continueUrl: 'https://holded.verifactu.business/auth/holded-direct?next=/foo',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.otpToken).toBe('string');
    expect(json.otpToken.length).toBeGreaterThan(20); // es un JWT

    // Firebase Admin generó el link
    expect(mockGenerateLink).toHaveBeenCalledWith('user@example.com', {
      url: 'https://holded.verifactu.business/auth/holded-direct?next=/foo',
      handleCodeInApp: true,
    });

    // Se llamó a Resend con el bearer correcto
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as Record<string, Record<string, string>>).headers.Authorization).toBe(
      'Bearer resend-test-key'
    );
    const sendBody = JSON.parse((init as { body: string }).body);
    expect(sendBody.from).toBe('Holded <no-reply@holded.verifactu.business>');
    expect(sendBody.to).toEqual(['user@example.com']);
    expect(sendBody.subject).toMatch(/enlace/i);
    // El html y text contienen un código OTP de 6 dígitos
    expect(sendBody.html).toMatch(/\d{6}/);
    expect(sendBody.text).toMatch(/\d{6}/);
  });

  it('NO devuelve otpToken si SESSION_SECRET no está configurado', async () => {
    delete process.env.SESSION_SECRET;
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({
        email: 'user@example.com',
        continueUrl: 'https://holded.verifactu.business/x',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.otpToken).toBeUndefined();
  });

  it('devuelve 502 cuando Resend responde con error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"message":"unauthorized"}', { status: 401 }));
    const { POST } = await import('./route');
    const res = await POST(
      buildRequest({
        email: 'user@example.com',
        continueUrl: 'https://holded.verifactu.business/x',
      })
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/no pudimos enviar/i);
  });

  it('aplica rate limit (5 por hora por IP) y devuelve 429 en el 6º intento', async () => {
    const { POST } = await import('./route');
    const ip = '9.9.9.9';
    const body = {
      email: 'user@example.com',
      continueUrl: 'https://holded.verifactu.business/x',
    };
    for (let i = 0; i < 5; i++) {
      const res = await POST(buildRequest(body, ip));
      expect(res.status).toBe(200);
    }
    const blocked = await POST(buildRequest(body, ip));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toMatch(/demasiad/i);
  });
});
