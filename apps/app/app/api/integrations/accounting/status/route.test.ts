/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  getAccountingIntegrationAccess: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionStatusForTenant: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  getHoldedOnboardingTokenFromHeaders: jest.fn((headers: Headers) =>
    headers.get('x-holded-onboarding-token')
  ),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { getHoldedOnboardingTokenFromHeaders } from '@/lib/integrations/holdedOnboardingSession';

describe('GET /api/integrations/accounting/status', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'demo@example.com', name: 'Demo User' },
    });
    (getAccountingIntegrationAccess as jest.Mock).mockResolvedValue({
      canConnect: true,
      canExportAeatBooks: true,
      canBidirectionalQuotes: false,
      connectionMode: 'holded_first',
      planCode: 'empresa',
    });
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue(null);
    (getHoldedOnboardingTokenFromHeaders as jest.Mock).mockImplementation((headers: Headers) =>
      headers.get('x-holded-onboarding-token')
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads dashboard state from the shared Holded resolver', async () => {
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue({
      id: 'ext-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'holded-company-1',
      credentialType: 'api_key',
      status: 'connected',
      channel: 'dashboard',
      lastSyncAt: '2026-04-04T12:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/status', {
        headers: { 'x-isaak-entry-channel': 'dashboard' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(resolveSharedHoldedConnectionStatusForTenant).toHaveBeenCalledWith(
      'tenant-1',
      'dashboard'
    );
    expect(payload).toMatchObject({
      provider: 'holded',
      status: 'connected',
      connected: true,
      lastSyncAt: '2026-04-04T12:00:00.000Z',
      lastError: null,
      degraded: false,
      plan: 'empresa',
      connectionMode: 'holded_first',
      requestId: expect.any(String),
    });
  });

  it('returns dashboard error details without degraded mode when the resolver reports an external error', async () => {
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue({
      id: 'ext-err-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: null,
      credentialType: 'api_key',
      status: 'error',
      channel: 'dashboard',
      lastSyncAt: '2026-04-03T12:00:00.000Z',
      lastError: 'holded validation failed',
      source: 'external_connection',
    });

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/status', {
        headers: { 'x-isaak-entry-channel': 'dashboard' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: 'error',
      connected: false,
      lastError: 'holded validation failed',
      degraded: false,
      requestId: expect.any(String),
    });
  });

  it('passes the onboarding token and tenant hint into chatgpt tenant resolution', async () => {
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue({
      id: 'ext-chatgpt-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'holded-company-1',
      credentialType: 'api_key',
      status: 'connected',
      channel: 'chatgpt',
      lastSyncAt: '2026-04-07T14:30:00.000Z',
      lastError: null,
      source: 'external_connection',
    });

    const response = await GET(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/status?channel=chatgpt&tenant_id=tenant-demo',
        {
          headers: {
            'x-isaak-entry-channel': 'chatgpt',
            'x-isaak-tenant-id': 'tenant-demo',
            'x-holded-onboarding-token': 'onboarding-token-123',
          },
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(requireTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: 'chatgpt',
        tenantIdHint: 'tenant-demo',
        onboardingToken: 'onboarding-token-123',
      })
    );
    expect(payload).toMatchObject({
      provider: 'holded',
      status: 'connected',
      connected: true,
      degraded: false,
    });
  });

  it('returns a degraded disconnected payload with failure diagnostics for chatgpt when status loading fails', async () => {
    (requireTenantContext as jest.Mock).mockRejectedValue(new Error('tenant resolution failed'));

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/status', {
        headers: { 'x-isaak-entry-channel': 'chatgpt' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      provider: 'holded',
      status: 'disconnected',
      connected: false,
      degraded: true,
      connectionMode: 'holded_first',
      requestId: expect.any(String),
      failureStage: 'auth',
      failureReason: 'tenant_context_unavailable',
    });
  });
});
