/** @jest-environment node */

/**
 * Tests F5.3 — endpoint receptor de eventos del conector. Verifica:
 *  - Reject de canal invalido y JSON malformado
 *  - Reject de eventos sin identidad resoluble
 *  - Auth via shared secret
 *  - Resolucion userId real → email + tenant
 *  - Dispatch al sender correcto por tipo de evento
 */

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    tenant: { findUnique: jest.fn() },
  },
}));

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  sendHoldedFirstActivityNotification: jest.fn(async () => ({ sent: true, messageId: 'm1' })),
  sendHoldedInvoiceDraftNotification: jest.fn(async () => ({ sent: true, messageId: 'm2' })),
  sendHoldedAuthFailuresBurst: jest.fn(async () => ({
    sent: true,
    recipients: { user: true, admin: 1 },
  })),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/app/lib/prisma';
import {
  sendHoldedAuthFailuresBurst,
  sendHoldedFirstActivityNotification,
  sendHoldedInvoiceDraftNotification,
} from '@/app/lib/communications/holded-email-service';

const userFindUnique = prisma.user.findUnique as jest.Mock;
const tenantFindUnique = prisma.tenant.findUnique as jest.Mock;

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(
    'https://holded.verifactu.business/api/integrations/holded/connector-event',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.VERIFACTU_APP_SHARED_SECRET;
  userFindUnique.mockResolvedValue({
    id: 'user-cuid-realabcdefgh1234567',
    email: 'demo@acme.com',
    name: 'Demo User',
    tenantMemberships: [{ tenantId: 'tenant-456' }],
  });
  tenantFindUnique.mockResolvedValue({
    name: 'Acme SL',
    profile: { tradeName: 'Acme', legalName: 'Acme SL' },
  });
});

describe('POST /api/integrations/holded/connector-event', () => {
  it('rechaza JSON malformado con 400', async () => {
    const res = await POST(buildRequest('not-json{'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('rechaza canal invalido con 400', async () => {
    const res = await POST(
      buildRequest({
        type: 'first_activity',
        userId: 'user-cuid-realabcdefgh1234567',
        channel: 'sms',
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_channel');
  });

  it('rechaza payload sin identidad resoluble (userId invalido y sin email)', async () => {
    userFindUnique.mockResolvedValueOnce(null);
    const res = await POST(
      buildRequest({ type: 'first_activity', userId: 'sha256-hash-not-cuid', channel: 'claude' })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('cannot_resolve_identity');
  });

  it('autoriza con shared secret cuando esta configurado', async () => {
    process.env.VERIFACTU_APP_SHARED_SECRET = 'secret-123';
    const resBad = await POST(
      buildRequest({
        type: 'first_activity',
        userId: 'user-cuid-realabcdefgh1234567',
        channel: 'claude',
      })
    );
    expect(resBad.status).toBe(401);

    const resOk = await POST(
      buildRequest(
        { type: 'first_activity', userId: 'user-cuid-realabcdefgh1234567', channel: 'claude' },
        { 'x-verifactu-shared-secret': 'secret-123' }
      )
    );
    expect(resOk.status).toBe(200);
  });

  it('first_activity: resuelve userId y dispatcha al sender admin', async () => {
    const res = await POST(
      buildRequest({
        type: 'first_activity',
        userId: 'user-cuid-realabcdefgh1234567',
        channel: 'claude',
        toolUsed: 'list_documents',
      })
    );
    expect(res.status).toBe(200);
    expect(sendHoldedFirstActivityNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Acme',
        userEmail: 'demo@acme.com',
        channel: 'claude',
        toolUsed: 'list_documents',
      })
    );
    expect(sendHoldedInvoiceDraftNotification).not.toHaveBeenCalled();
    expect(sendHoldedAuthFailuresBurst).not.toHaveBeenCalled();
  });

  it('invoice_draft_created: pasa draft details al sender', async () => {
    const res = await POST(
      buildRequest({
        type: 'invoice_draft_created',
        userId: 'user-cuid-realabcdefgh1234567',
        channel: 'claude',
        draftId: 'doc-1',
        draftNumber: 'F2026-001',
        contactName: 'Cliente X',
        total: 999.99,
        currency: 'EUR',
      })
    );
    expect(res.status).toBe(200);
    expect(sendHoldedInvoiceDraftNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        draftNumber: 'F2026-001',
        contactName: 'Cliente X',
        total: 999.99,
        currency: 'EUR',
      })
    );
  });

  it('auth_failures_burst: rechaza failureCount<1 con 400', async () => {
    const res = await POST(
      buildRequest({
        type: 'auth_failures_burst',
        userId: 'user-cuid-realabcdefgh1234567',
        channel: 'claude',
        failureCount: 0,
        windowMinutes: 60,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_failure_count');
  });

  it('auth_failures_burst: dispatcha personal+admin con userName fallback', async () => {
    userFindUnique.mockResolvedValueOnce({
      id: 'user-cuid-realabcdefgh1234567',
      email: 'demo@acme.com',
      name: null,
      tenantMemberships: [{ tenantId: 'tenant-456' }],
    });
    const res = await POST(
      buildRequest({
        type: 'auth_failures_burst',
        userId: 'user-cuid-realabcdefgh1234567',
        channel: 'mobile',
        failureCount: 3,
        windowMinutes: 60,
      })
    );
    expect(res.status).toBe(200);
    expect(sendHoldedAuthFailuresBurst).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: 'demo@acme.com',
        userName: 'demo', // fallback al local-part del email
        channel: 'mobile',
        failureCount: 3,
        windowMinutes: 60,
      })
    );
  });

  it('acepta payload legacy sin userId pero con userEmail+tenantId explicitos', async () => {
    const res = await POST(
      buildRequest({
        type: 'first_activity',
        userEmail: 'legacy@example.com',
        tenantId: 'tenant-legacy',
        channel: 'claude',
      })
    );
    expect(res.status).toBe(200);
    expect(sendHoldedFirstActivityNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: 'legacy@example.com' })
    );
  });
});
