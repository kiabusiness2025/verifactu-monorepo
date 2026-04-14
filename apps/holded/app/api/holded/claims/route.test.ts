/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/holded-governance', () => ({
  __esModule: true,
  createPublicClaim: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    externalConnection: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/communications/holded-governance-emails', () => ({
  __esModule: true,
  sendPublicClaimCreatedEmails: jest.fn(),
}));

jest.mock('@verifactu/integrations', () => ({
  __esModule: true,
  getConnectorRequestId: jest.fn(() => 'req-claim-1'),
  withConnectorRequestId: jest.fn((response: Response) => response),
  buildConnectorEvent: jest.fn((input: Record<string, unknown>) => input),
  logConnectorEvent: jest.fn(),
  buildGovernanceFlags: jest.fn((input?: Record<string, unknown> | null) => ({
    ownershipStatus: input?.ownershipStatus ?? null,
    managedByThirdParty: input?.managedByThirdParty === true,
    clientAdminGap: input?.clientAdminGap === true,
    highGovernanceRisk: input?.highGovernanceRisk === true,
    underClaimReview: input?.underClaimReview === true,
  })),
  buildDefaultAvailableActions: jest.fn((input?: Record<string, unknown>) => {
    const hasActiveConnection = (input?.status ?? 'disconnected') !== 'disconnected';
    const underClaimReview = input?.underClaimReview === true;

    return {
      reconnect: {
        blocked: false,
        reason: 'ok',
        state: hasActiveConnection ? 'connected' : 'disconnected',
        suggestedAction: null,
        suggestedActionLabel: null,
      },
      rotateApi: {
        blocked: !hasActiveConnection,
        reason: hasActiveConnection ? 'ok' : 'blocked',
        state: hasActiveConnection ? 'connected' : 'disconnected',
        suggestedAction: hasActiveConnection ? null : 'reconnect',
        suggestedActionLabel: hasActiveConnection ? null : 'Reconectar',
      },
      disconnect: {
        blocked: underClaimReview,
        reason: underClaimReview ? 'blocked' : 'ok',
        state: underClaimReview
          ? 'under_claim_review'
          : hasActiveConnection
            ? 'connected'
            : 'disconnected',
        suggestedAction: null,
        suggestedActionLabel: null,
      },
      manageMembers: {
        blocked: false,
        reason: 'ok',
        state: hasActiveConnection ? 'connected' : 'disconnected',
        suggestedAction: null,
        suggestedActionLabel: null,
      },
      manageRecipients: {
        blocked: false,
        reason: 'ok',
        state: hasActiveConnection ? 'connected' : 'disconnected',
        suggestedAction: null,
        suggestedActionLabel: null,
      },
      openClaim: {
        blocked: underClaimReview,
        reason: underClaimReview
          ? 'Ya existe una reclamacion en revision para esta conexion.'
          : 'ok',
        state: underClaimReview
          ? 'under_claim_review'
          : hasActiveConnection
            ? 'connected'
            : 'disconnected',
        suggestedAction: null,
        suggestedActionLabel: null,
      },
    };
  }),
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { createPublicClaim } from '@/app/lib/holded-governance';
import { prisma } from '@/app/lib/prisma';
import { sendPublicClaimCreatedEmails } from '@/app/lib/communications/holded-governance-emails';
import { POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockCreatePublicClaim = createPublicClaim as jest.Mock;
const mockConnectionFindUnique = prisma.externalConnection.findUnique as jest.Mock;
const mockSendPublicClaimCreatedEmails = sendPublicClaimCreatedEmails as jest.Mock;

describe('POST /api/holded/claims', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: 'ana@example.com',
    });
    mockCreatePublicClaim.mockResolvedValue({
      claimId: 'claim-1',
      connectionId: 'ext-1',
      claimType: 'control',
      status: 'submitted',
      reason: 'La conexion no deberia seguir asi',
      scope: null,
      requiresInternalReview: true,
      createdBy: { userId: 'user_1', name: 'Ana', email: 'ana@example.com' },
      createdAt: '2026-04-12T12:00:00.000Z',
      resolvedAt: null,
      outcome: null,
    });
    mockSendPublicClaimCreatedEmails.mockResolvedValue(true);
  });

  it('creates a public claim and returns governance flags', async () => {
    mockConnectionFindUnique
      .mockResolvedValueOnce({
        id: 'ext-1',
        connectionStatus: 'connected',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: true,
        clientAdminGap: true,
        highGovernanceRisk: true,
        underClaimReview: false,
      })
      .mockResolvedValueOnce({
        id: 'ext-1',
        connectionStatus: 'connected',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: true,
        clientAdminGap: true,
        highGovernanceRisk: true,
        underClaimReview: true,
      });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'ext-1',
          claimType: 'control',
          reason: 'La conexion no deberia seguir asi',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreatePublicClaim).toHaveBeenCalledWith({
      requesterUserId: 'user_1',
      connectionId: 'ext-1',
      claimType: 'control',
      reason: 'La conexion no deberia seguir asi',
      scope: null,
    });
    expect(payload).toMatchObject({
      ok: true,
      notified: true,
      nextStep: 'claim_submitted',
      claim: {
        claimId: 'claim-1',
      },
      governanceFlags: {
        highGovernanceRisk: true,
        underClaimReview: true,
      },
    });
  });

  it('keeps claim creation successful when notification delivery fails', async () => {
    mockConnectionFindUnique
      .mockResolvedValueOnce({
        id: 'ext-1',
        connectionStatus: 'connected',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: true,
        clientAdminGap: true,
        highGovernanceRisk: true,
        underClaimReview: false,
      })
      .mockResolvedValueOnce({
        id: 'ext-1',
        connectionStatus: 'connected',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: true,
        clientAdminGap: true,
        highGovernanceRisk: true,
        underClaimReview: true,
      });
    mockSendPublicClaimCreatedEmails.mockRejectedValue(new Error('smtp_down'));

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'ext-1',
          claimType: 'control',
          reason: 'La conexion no deberia seguir asi',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(false);
  });

  it('blocks public claim creation when an open claim is already under review', async () => {
    mockConnectionFindUnique.mockResolvedValue({
      id: 'ext-1',
      connectionStatus: 'connected',
      ownershipStatus: 'pending_confirmation',
      managedByThirdParty: true,
      clientAdminGap: true,
      highGovernanceRisk: true,
      underClaimReview: true,
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'ext-1',
          claimType: 'control',
          reason: 'La conexion no deberia seguir asi',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('Ya existe una reclamacion en revision');
    expect(payload.availableActions.openClaim.blocked).toBe(true);
    expect(mockCreatePublicClaim).not.toHaveBeenCalled();
  });
});
