/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  getAccountingIntegrationAccess: jest.fn(),
}));

jest.mock('@/lib/integrations/accounting', () => ({
  maskSecret: jest.fn(() => 'demo****key'),
  probeAccountingApiConnection: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';

describe('POST /api/integrations/accounting/validate', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'demo@example.com', name: 'Demo User' },
    });
    (getAccountingIntegrationAccess as jest.Mock).mockResolvedValue({
      canConnect: true,
      connectionMode: 'holded_first',
      planCode: 'empresa',
    });
    (probeAccountingApiConnection as jest.Mock).mockResolvedValue({ ok: true, provider: 'holded' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validates the api key without persisting the connection', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/validate',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.keyMasked).toBe('demo****key');
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key');
  });

  it('normalizes pasted api keys before validating them', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/validate',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: ' demo-\nkey \t 123 ',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key123');
  });
});
