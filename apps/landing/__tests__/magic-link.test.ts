/**
 * Tests unitarios para POST /api/auth/magic-link
 *
 * Cubre:
 * 1. Rate limit → 429
 * 2. Email inválido → 400
 * 3. continueUrl ausente → 400
 * 4. continueUrl no permitida → 400
 * 5. Firebase vars no configuradas → 503
 * 6. Firebase lanza error → 500
 * 7. Resend falla → 502
 * 8. Happy path → 200, llama a Firebase y Resend con los datos correctos
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — deben ir antes de cualquier import del módulo bajo prueba.
// Las variables con prefijo "mock" se elevan junto a jest.mock() por Babel.
// NO importar firebase-admin directamente aquí (activaría el factory antes
// de que las constantes mock* estén inicializadas).
// ---------------------------------------------------------------------------

// Array compartido para simular admin.apps y poder resetearlo entre tests.
const mockApps: unknown[] = [];

const mockGenerateSignInWithEmailLink = jest.fn();
const mockAuth = jest.fn(() => ({ generateSignInWithEmailLink: mockGenerateSignInWithEmailLink }));
const mockInitializeApp = jest.fn((_config: unknown, name?: string) => ({
  name: name ?? '[DEFAULT]',
}));

jest.mock('firebase-admin', () => ({
  get apps() {
    return mockApps;
  },
  initializeApp: mockInitializeApp,
  credential: { cert: jest.fn((c: unknown) => c) },
  auth: mockAuth,
}));

// Mock global fetch (Resend raw call)
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

let _testIpCounter = 0;

function makeRequest(body: Record<string, unknown>, ip?: string) {
  // Each call gets a unique IP by default to avoid rate-limit collisions between tests.
  const clientIp = ip ?? `10.0.0.${(_testIpCounter++ % 250) + 1}`;
  return new NextRequest('https://verifactu.business/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': clientIp,
    },
    body: JSON.stringify(body),
  });
}

function mockResendOk() {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '',
  });
}

function mockResendFail(status = 422, body = 'Unprocessable Entity') {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    text: async () => body,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/magic-link', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  const VALID_BODY = {
    email: 'test@example.com',
    continueUrl: 'https://verifactu.business/auth/isaak?source=test',
  };

  beforeAll(async () => {
    process.env.FIREBASE_ADMIN_PROJECT_ID = 'test-project';
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.FIREBASE_ADMIN_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.RESEND_FROM = 'Isaak <noreply@verifactu.business>';

    const mod = await import('../app/api/auth/magic-link/route');
    POST = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockApps.length = 0; // reset para forzar re-inicialización en cada test
    mockGenerateSignInWithEmailLink.mockResolvedValue(
      'https://firebaseapp.com/__/auth/action?oobCode=abc'
    );
  });

  // --- Validación de entrada ---

  it('devuelve 400 si el body es inválido', async () => {
    const req = new NextRequest('https://verifactu.business/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.251' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si el email está vacío', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('nválido');
  });

  it('devuelve 400 si el email no tiene formato válido', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si continueUrl está ausente', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('continuación');
  });

  it('devuelve 400 si continueUrl no es una URL válida', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, continueUrl: 'not-a-url' }));
    expect(res.status).toBe(400);
  });

  it.each([
    'https://evil.com/auth',
    'https://notverifactu.business/auth',
    'https://verifactu.business.evil.com/auth',
  ])('devuelve 400 para continueUrl no permitida: %s', async (continueUrl) => {
    const res = await POST(makeRequest({ ...VALID_BODY, continueUrl }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('no permitida');
  });

  it.each([
    'https://verifactu.business/auth/isaak',
    'https://isaak.verifactu.business/auth/callback',
    'https://app.verifactu.business/dashboard',
    'https://isaak.app/auth/isaak',
    'https://www.isaak.app/auth/isaak',
    'https://isaak.chat/auth/isaak',
    'https://www.isaak.chat/auth/isaak',
    'http://localhost:3000/auth',
    'http://localhost:3001/auth',
    'http://localhost:3002/auth',
    'http://localhost:3003/auth',
  ])('acepta continueUrl permitida: %s', async (continueUrl) => {
    mockResendOk();
    const res = await POST(makeRequest({ email: 'test@example.com', continueUrl }));
    expect(res.status).toBe(200);
  });

  // --- Firebase ---

  it('devuelve 503 si faltan las vars de Firebase Admin', async () => {
    const savedProject = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const savedEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const savedKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    // También eliminar los fallbacks
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);

    process.env.FIREBASE_ADMIN_PROJECT_ID = savedProject;
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = savedEmail;
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = savedKey;
  });

  it('devuelve 500 si Firebase lanza un error al generar el enlace', async () => {
    mockGenerateSignInWithEmailLink.mockRejectedValue(
      new Error('The provided continue URL domain is not whitelisted')
    );
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it('llama a generateSignInWithEmailLink con el email y continueUrl correctos', async () => {
    mockResendOk();
    await POST(makeRequest(VALID_BODY));
    expect(mockGenerateSignInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(mockGenerateSignInWithEmailLink).toHaveBeenCalledWith('test@example.com', {
      url: VALID_BODY.continueUrl,
      handleCodeInApp: true,
    });
  });

  // --- Resend ---

  it('devuelve 503 si RESEND_API_KEY no está configurada', async () => {
    const saved = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    process.env.RESEND_API_KEY = saved;
  });

  it('devuelve 502 si Resend responde con error', async () => {
    mockResendFail(422, '{"name":"validation_error","message":"Invalid from address"}');
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
  });

  it('llama a Resend con el email destino y el enlace de Firebase', async () => {
    const firebaseLink = 'https://verifactu-business.firebaseapp.com/__/auth/action?oobCode=XYZ';
    mockGenerateSignInWithEmailLink.mockResolvedValue(firebaseLink);
    mockResendOk();

    await POST(makeRequest(VALID_BODY));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');

    const sentBody = JSON.parse(options.body as string);
    expect(sentBody.to).toEqual(['test@example.com']);
    expect(sentBody.html).toContain(firebaseLink);
    expect(sentBody.text).toContain(firebaseLink);
    expect(sentBody.subject).toContain('enlace');
  });

  // --- Happy path ---

  it('devuelve 200 con ok:true en el happy path', async () => {
    mockResendOk();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  // --- Rate limit ---

  it('devuelve 429 cuando se supera el límite de 5 peticiones por hora desde la misma IP', async () => {
    mockResendOk();
    const FIXED_IP = '192.168.99.99';
    // Las primeras 5 deben pasar
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        makeRequest({ ...VALID_BODY, email: `ratelimit${i}@example.com` }, FIXED_IP)
      );
      expect(res.status).toBe(200);
    }
    // La 6ª desde la misma IP debe dar 429
    const res = await POST(
      makeRequest({ ...VALID_BODY, email: 'ratelimit6@example.com' }, FIXED_IP)
    );
    expect(res.status).toBe(429);
  });
});
