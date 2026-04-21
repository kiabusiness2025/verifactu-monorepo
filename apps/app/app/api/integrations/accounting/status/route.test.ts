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

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  buildHoldedSummaries: jest.fn(async () => ({
    membershipsSummary: { total: 1 },
    recipientsSummary: { total: 1 },
    claimsSummary: { open: 0 },
    governanceFlags: null,
    availableActions: null,
  })),
}));

jest.mock(
  '@verifactu/integrations',
  () => ({
    buildConnectionStatusDto: jest.fn((input: Record<string, unknown>) => ({
      connectionId: input.connectionId ?? 'holded-connection',
      tenantId: input.tenantId,
      provider: 'holded',
      status: input.status === 'error' ? 'failed' : (input.status ?? 'disconnected'),
      keyMasked: input.keyMasked ?? null,
      providerAccountId: input.providerAccountId ?? null,
      connectedAt: input.connectedAt ?? null,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastSyncAt: input.lastSyncAt ?? null,
      lastError: input.lastError ?? null,
      originChannel: input.originChannel ?? null,
      supportedModules: input.supportedModules ?? [],
    })),
    buildDefaultAvailableActions: jest.fn((input?: Record<string, unknown>) => {
      const status = typeof input?.status === 'string' ? input.status : 'disconnected';
      const underClaimReview = input?.underClaimReview === true;
      const clientAdminGap = input?.clientAdminGap === true;
      const highGovernanceRisk = input?.highGovernanceRisk === true;
      const hasActiveConnection = status !== 'disconnected';
      return {
        reconnect: {
          blocked: false,
          reason: 'ok',
          state: status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        rotateApi: {
          blocked: !hasActiveConnection,
          reason: hasActiveConnection ? 'ok' : 'blocked',
          state: status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        disconnect: {
          blocked: !hasActiveConnection || underClaimReview || highGovernanceRisk,
          reason: highGovernanceRisk ? 'guarded' : 'ok',
          state: underClaimReview
            ? 'under_claim_review'
            : highGovernanceRisk
              ? 'high_governance_risk'
              : status,
          suggestedAction: highGovernanceRisk
            ? clientAdminGap
              ? 'manageMembers'
              : 'manageRecipients'
            : null,
          suggestedActionLabel: highGovernanceRisk
            ? clientAdminGap
              ? 'Revisar usuarios'
              : 'Revisar destinatarios'
            : null,
        },
        manageMembers: {
          blocked: false,
          reason: 'ok',
          state: clientAdminGap ? 'client_admin_gap' : status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        manageRecipients: {
          blocked: false,
          reason: 'ok',
          state: highGovernanceRisk ? 'high_governance_risk' : status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        openClaim: {
          blocked: underClaimReview,
          reason: underClaimReview ? 'blocked' : 'ok',
          state: underClaimReview ? 'under_claim_review' : status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
      };
    }),
    buildGovernanceFlags: jest.fn((input?: Record<string, unknown> | null) => ({
      ownershipStatus: input?.ownershipStatus ?? null,
      managedByThirdParty: input?.managedByThirdParty === true,
      clientAdminGap: input?.clientAdminGap === true,
      highGovernanceRisk: input?.highGovernanceRisk === true,
      underClaimReview: input?.underClaimReview === true,
    })),
  }),
  { virtual: true }
);

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
      session: { uid: 'session-1', email: 'soporte@verifactu.business', name: 'Demo User' },
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
        headers: { 'x-holded-entry-channel': 'dashboard' },
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
      connection: {
        provider: 'holded',
        status: 'connected',
      },
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
        headers: { 'x-holded-entry-channel': 'dashboard' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      connection: {
        provider: 'holded',
        status: 'failed',
      },
      status: 'failed',
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
            'x-holded-entry-channel': 'chatgpt',
            'x-holded-tenant-id': 'tenant-demo',
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
      connection: {
        provider: 'holded',
        status: 'connected',
      },
      status: 'connected',
      connected: true,
      degraded: false,
    });
  });

  it('blocks disconnect in the payload when governance risk is high', async () => {
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue({
      id: 'ext-risk-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'holded-company-1',
      credentialType: 'api_key',
      status: 'connected',
      channel: 'dashboard',
      originChannel: 'dashboard',
      ownershipStatus: 'third_party_managed',
      managedByThirdParty: true,
      clientAdminGap: true,
      highGovernanceRisk: true,
      underClaimReview: false,
      lastSyncAt: '2026-04-07T14:30:00.000Z',
      lastError: null,
      source: 'external_connection',
    });

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/status', {
        headers: { 'x-holded-entry-channel': 'dashboard' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.governanceFlags).toMatchObject({
      managedByThirdParty: true,
      clientAdminGap: true,
      highGovernanceRisk: true,
    });
    expect(payload.availableActions.disconnect).toMatchObject({
      blocked: true,
      state: 'high_governance_risk',
      suggestedAction: 'manageMembers',
      suggestedActionLabel: 'Revisar usuarios',
    });
  });

  it('returns a degraded disconnected payload with failure diagnostics for chatgpt when status loading fails', async () => {
    (requireTenantContext as jest.Mock).mockRejectedValue(new Error('tenant resolution failed'));

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/status', {
        headers: { 'x-holded-entry-channel': 'chatgpt' },
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
