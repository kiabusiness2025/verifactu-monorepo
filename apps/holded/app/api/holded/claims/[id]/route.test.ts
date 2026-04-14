/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/holded-governance', () => ({
  __esModule: true,
  getPublicClaimDetails: jest.fn(),
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { getPublicClaimDetails } from '@/app/lib/holded-governance';
import { GET } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockGetPublicClaimDetails = getPublicClaimDetails as jest.Mock;

describe('GET /api/holded/claims/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: 'ana@example.com',
    });
    mockGetPublicClaimDetails.mockResolvedValue({
      claim: {
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
      },
      timeline: [
        {
          resolutionId: 'res-1',
          action: 'claim_created',
          previousStatus: null,
          nextStatus: 'submitted',
          notes: 'La conexion no deberia seguir asi',
          createdAt: '2026-04-12T12:00:00.000Z',
          actor: { userId: 'user_1', name: 'Ana', email: 'ana@example.com' },
        },
      ],
      availableActions: {
        reconnect: {
          blocked: false,
          reason: 'ok',
          state: 'connected',
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        rotateApi: {
          blocked: false,
          reason: 'ok',
          state: 'connected',
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        disconnect: {
          blocked: true,
          reason: 'blocked',
          state: 'under_claim_review',
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        manageMembers: {
          blocked: false,
          reason: 'ok',
          state: 'connected',
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        manageRecipients: {
          blocked: false,
          reason: 'ok',
          state: 'connected',
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        openClaim: {
          blocked: true,
          reason: 'blocked',
          state: 'under_claim_review',
          suggestedAction: null,
          suggestedActionLabel: null,
        },
      },
    });
  });

  it('returns claim details for the requester', async () => {
    const response = await GET(
      new Request('https://holded.verifactu.business/api/holded/claims/claim-1') as never,
      { params: Promise.resolve({ id: 'claim-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetPublicClaimDetails).toHaveBeenCalledWith({
      requesterUserId: 'user_1',
      tenantId: 'tenant_1',
      claimId: 'claim-1',
    });
    expect(payload).toMatchObject({
      claim: {
        claimId: 'claim-1',
      },
      timeline: [
        {
          resolutionId: 'res-1',
        },
      ],
      availableActions: {
        disconnect: {
          blocked: true,
          state: 'under_claim_review',
        },
      },
    });
  });
});
