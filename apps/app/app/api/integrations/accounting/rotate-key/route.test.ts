/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/accounting', () => ({
  encryptIntegrationSecret: jest.fn(() => 'encrypted-demo-key'),
  probeAccountingApiConnection: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedValidationToken', () => ({
  verifyHoldedValidationToken: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  upsertAccountingIntegration: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionStatusForTenant: jest.fn(),
}));

jest.mock(
  '@verifactu/integrations',
  () => ({
    buildConnectionStatusDto: jest.fn((input: Record<string, unknown>) => ({
      connectionId: input.connectionId ?? 'holded-connection',
      tenantId: input.tenantId,
      provider: 'holded',
      status: input.status ?? 'connected',
      keyMasked: input.keyMasked ?? null,
      providerAccountId: input.providerAccountId ?? null,
      connectedAt: input.connectedAt ?? null,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastSyncAt: input.lastSyncAt ?? null,
      lastError: input.lastError ?? null,
      originChannel: input.originChannel ?? null,
      supportedModules: input.supportedModules ?? [],
    })),
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
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';

describe('POST /api/integrations/accounting/rotate-key', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
    (probeAccountingApiConnection as jest.Mock).mockResolvedValue({
      ok: true,
      error: null,
    });
    (upsertAccountingIntegration as jest.Mock).mockResolvedValue(undefined);
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue({
      id: 'ext-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'provider-account-1',
      credentialType: 'api_key',
      status: 'connected',
      channel: 'dashboard',
      originChannel: 'dashboard',
      ownershipStatus: 'pending_confirmation',
      managedByThirdParty: false,
      clientAdminGap: false,
      highGovernanceRisk: false,
      underClaimReview: false,
      technicalOperatorUserId: 'user-1',
      connectedAt: '2026-04-11T12:00:00.000Z',
      lastValidatedAt: '2026-04-11T12:00:00.000Z',
      lastSyncAt: '2026-04-11T12:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rotates the key when reauth is confirmed', async () => {
    const response = await POST(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/rotate-key', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'demo-key',
          reauthConfirmed: true,
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.event).toBe('api_rotated');
    expect(payload.connection).toMatchObject({
      provider: 'holded',
      status: 'connected',
    });
  });
});
