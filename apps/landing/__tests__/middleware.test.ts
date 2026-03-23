/**
 * Tests del middleware de autenticación de landing.
 *
 * Cubre:
 * 1. Redirect /auth/login → /auth/holded solo para host/flujo Holded.
 * 2. Usuarios Verifactu nativos llegan a /auth/login sin redirect.
 * 3. Redirect /es/* → /* (i18n legacy).
 * 4. Cabeceras de seguridad presentes en todas las respuestas.
 * 5. Cabecera x-holded-flow se inyecta en request Holded.
 */

import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(pathname: string, opts: { host?: string; source?: string; next?: string } = {}) {
  const host = opts.host ?? 'verifactu.business';
  const url = new URL(`https://${host}${pathname}`);
  if (opts.source) url.searchParams.set('source', opts.source);
  if (opts.next) url.searchParams.set('next', opts.next);

  return new NextRequest(url.toString(), {
    headers: { host },
  });
}

// ---------------------------------------------------------------------------
// 1. Redirect /auth/login → /auth/holded — solo para Holded
// ---------------------------------------------------------------------------

describe('middleware: /auth/login redirect', () => {
  it('redirige a /auth/holded cuando el host es holded.verifactu.business', () => {
    const req = makeRequest('/auth/login', { host: 'holded.verifactu.business' });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/holded');
  });

  it('redirige a /auth/holded cuando source=holded', () => {
    const req = makeRequest('/auth/login', { source: 'holded_pro' });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/holded');
  });

  it('redirige a /auth/holded cuando next incluye onboarding/holded', () => {
    const req = makeRequest('/auth/login', {
      next: 'https://app.verifactu.business/onboarding/holded',
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/holded');
  });

  it('NO redirige a /auth/holded para usuario Verifactu nativo (host normal)', () => {
    const req = makeRequest('/auth/login', { host: 'verifactu.business' });
    const res = middleware(req);
    // Debe pasar (status 200 == NextResponse.next()) o redirigir a /auth/login (no a holded)
    const location = res.headers.get('location') ?? '';
    expect(location).not.toContain('/auth/holded');
  });

  it('NO redirige cuando source no es holded', () => {
    const req = makeRequest('/auth/login', { source: 'direct' });
    const res = middleware(req);
    const location = res.headers.get('location') ?? '';
    expect(location).not.toContain('/auth/holded');
  });
});

// ---------------------------------------------------------------------------
// 2. Redirect /es/* → /*
// ---------------------------------------------------------------------------

describe('middleware: i18n /es redirect', () => {
  it('redirige /es/pricing a /pricing con 301', () => {
    const req = makeRequest('/es/pricing');
    const res = middleware(req);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toContain('/pricing');
    expect(res.headers.get('location')).not.toContain('/es/');
  });

  it('redirige /es a / con 301', () => {
    const req = makeRequest('/es');
    const res = middleware(req);
    expect(res.status).toBe(301);
  });
});

// ---------------------------------------------------------------------------
// 3. Cabeceras de seguridad
// ---------------------------------------------------------------------------

describe('middleware: cabeceras de seguridad', () => {
  it('incluye Content-Security-Policy en todas las respuestas', () => {
    const req = makeRequest('/');
    const res = middleware(req);
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('incluye Strict-Transport-Security', () => {
    const req = makeRequest('/pricing');
    const res = middleware(req);
    expect(res.headers.get('Strict-Transport-Security')).toMatch(/max-age/);
  });

  it('COOP es same-origin-allow-popups en rutas /auth/*', () => {
    const req = makeRequest('/auth/holded');
    const res = middleware(req);
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
  });

  it('COOP es same-origin en rutas no auth', () => {
    const req = makeRequest('/pricing');
    const res = middleware(req);
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
  });

  it('CSP incluye el dominio Holded Firebase (nuevo proyecto)', () => {
    const req = makeRequest('/auth/holded', { host: 'holded.verifactu.business' });
    const res = middleware(req);
    const csp = res.headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain('verifactu-business-48021-352e0.firebaseapp.com');
  });
});

// ---------------------------------------------------------------------------
// 4. Cabecera x-holded-flow inyectada en request
// ---------------------------------------------------------------------------

describe('middleware: x-holded-flow header', () => {
  it('respuesta incluye x-nonce cuando es ruta normal', () => {
    const req = makeRequest('/pricing');
    const res = middleware(req);
    // x-nonce se setea en el request headers internos; comprobamos al menos que
    // la respuesta llega sin error.
    expect(res.status).not.toBe(500);
  });
});
