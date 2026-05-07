/** @jest-environment node */

jest.mock('@/lib/integrations/holdedConnectionUpsert', () => ({
  upsertHoldedConnectionFromApiKey: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { upsertHoldedConnectionFromApiKey } from '@/lib/integrations/holdedConnectionUpsert';

const helperMock = upsertHoldedConnectionFromApiKey as jest.MockedFunction<
  typeof upsertHoldedConnectionFromApiKey
>;

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/integrations/holded/upsert-from-key', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': 'req-test' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/integrations/holded/upsert-from-key', () => {
  it('rechaza body no JSON con stage=input', async () => {
    const response = await POST(buildRequest('not-json{'));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({ ok: false, stage: 'input', reason: 'invalid_json' });
    expect(helperMock).not.toHaveBeenCalled();
  });

  it('rechaza canal inválido sin llamar al helper', async () => {
    const response = await POST(
      buildRequest({
        personalEmail: 'a@b.com',
        holdedApiKey: 'k1234',
        channel: 'unknown',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({ ok: false, stage: 'input', reason: 'invalid_channel' });
    expect(helperMock).not.toHaveBeenCalled();
  });

  it('mapea stage=probe del helper a HTTP 422', async () => {
    helperMock.mockResolvedValueOnce({
      ok: false,
      stage: 'probe',
      reason: 'probe_failed',
      detail: 'timeout',
      probe: null,
    });
    const response = await POST(
      buildRequest({
        personalEmail: 'a@b.com',
        holdedApiKey: 'k1234',
        channel: 'mobile',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );
    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json).toMatchObject({ ok: false, stage: 'probe', reason: 'probe_failed' });
  });

  it('mapea stage=persist del helper a HTTP 500', async () => {
    helperMock.mockResolvedValueOnce({
      ok: false,
      stage: 'persist',
      reason: 'persist_failed',
      detail: 'db down',
    });
    const response = await POST(
      buildRequest({
        personalEmail: 'a@b.com',
        holdedApiKey: 'k1234',
        channel: 'claude',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toMatchObject({ ok: false, stage: 'persist' });
  });

  it('devuelve 200 con userId/tenantId/connectionId en happy path', async () => {
    helperMock.mockResolvedValueOnce({
      ok: true,
      userId: 'u1',
      tenantId: 't1',
      connectionId: 'c1',
      status: 'connected',
      probe: { ok: true } as never,
      legalAcceptedAt: '2026-05-06T00:00:00.000Z',
      created: { user: true, tenant: true, membership: true },
    });
    const response = await POST(
      buildRequest({
        personalEmail: 'a@b.com',
        personalName: 'Demo User',
        holdedApiKey: 'apikey-xyz',
        channel: 'chatgpt',
        acceptedTerms: true,
        acceptedPrivacy: true,
        source: 'chatgpt_oauth_form',
        companyName: 'Acme',
        companyTaxId: 'B12345678',
      })
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      ok: true,
      userId: 'u1',
      tenantId: 't1',
      connectionId: 'c1',
      status: 'connected',
      requestId: 'req-test',
    });
    expect(helperMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personalEmail: 'a@b.com',
        personalName: 'Demo User',
        holdedApiKey: 'apikey-xyz',
        channel: 'chatgpt',
        acceptedTerms: true,
        acceptedPrivacy: true,
        source: 'chatgpt_oauth_form',
        companyName: 'Acme',
        companyTaxId: 'B12345678',
      })
    );
  });

  it('propaga el x-verifactu-request-id en la respuesta', async () => {
    helperMock.mockResolvedValueOnce({
      ok: true,
      userId: 'u',
      tenantId: 't',
      connectionId: 'c',
      status: 'connected',
      probe: { ok: true } as never,
      legalAcceptedAt: '2026-05-06T00:00:00.000Z',
      created: { user: false, tenant: false, membership: false },
    });
    const response = await POST(
      buildRequest({
        personalEmail: 'a@b.com',
        holdedApiKey: 'k',
        channel: 'mobile',
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    );
    expect(response.headers.get('x-verifactu-request-id')).toBe('req-test');
  });
});
