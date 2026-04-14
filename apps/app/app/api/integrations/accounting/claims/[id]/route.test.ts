/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  getClaimDetails: jest.fn(),
  updateClaim: jest.fn(),
  getTenantHoldedContext: jest.fn(),
}));

jest.mock('@/lib/email/holdedGovernanceEmails', () => ({
  sendClaimResolvedEmails: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendClaimResolvedEmails } from '@/lib/email/holdedGovernanceEmails';
import {
  getClaimDetails,
  getTenantHoldedContext,
  updateClaim,
} from '@/lib/integrations/holdedGovernanceService';

describe('accounting claim detail route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      governanceFlags: {
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: true,
        highGovernanceRisk: false,
        underClaimReview: false,
      },
      availableActions: {
        openClaim: { blocked: false, reason: 'ok', state: 'connected' },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns claim details and timeline', async () => {
    (getClaimDetails as jest.Mock).mockResolvedValue({
      claim: {
        claimId: 'claim-1',
        connectionId: 'connection-1',
        claimType: 'control',
        status: 'under_review',
        reason: 'Mismatch',
        scope: null,
        requiresInternalReview: true,
        createdBy: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
        createdAt: '2026-04-11T12:00:00.000Z',
        resolvedAt: null,
        outcome: null,
      },
      timeline: [
        {
          resolutionId: 'resolution-1',
          action: 'claim_created',
          previousStatus: null,
          nextStatus: 'submitted',
          notes: 'Mismatch',
          createdAt: '2026-04-11T12:00:00.000Z',
          actor: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
        },
      ],
    });

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims/claim-1'),
      { params: Promise.resolve({ id: 'claim-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.claim.status).toBe('under_review');
    expect(payload.timeline).toHaveLength(1);
  });

  it('updates a claim status', async () => {
    (updateClaim as jest.Mock).mockResolvedValue({
      claimId: 'claim-1',
      connectionId: 'connection-1',
      claimType: 'control',
      status: 'resolved_approved',
      reason: 'Mismatch',
      scope: null,
      requiresInternalReview: true,
      createdBy: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
      createdAt: '2026-04-11T12:00:00.000Z',
      resolvedAt: '2026-04-11T12:10:00.000Z',
      outcome: 'approved',
    });
    (sendClaimResolvedEmails as jest.Mock).mockResolvedValue(true);

    const response = await PATCH(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims/claim-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved_approved',
          outcome: 'approved',
          resolutionNotes: 'Validated internally',
        }),
      }),
      { params: Promise.resolve({ id: 'claim-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(true);
    expect(payload.claim.status).toBe('resolved_approved');
    expect(payload.governanceFlags.underClaimReview).toBe(false);
  });

  it('keeps claim resolution successful when notification delivery fails', async () => {
    (updateClaim as jest.Mock).mockResolvedValue({
      claimId: 'claim-1',
      connectionId: 'connection-1',
      claimType: 'control',
      status: 'resolved_rejected',
      reason: 'Mismatch',
      scope: null,
      requiresInternalReview: true,
      createdBy: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
      createdAt: '2026-04-11T12:00:00.000Z',
      resolvedAt: '2026-04-11T12:10:00.000Z',
      outcome: 'rejected',
    });
    (sendClaimResolvedEmails as jest.Mock).mockRejectedValue(new Error('smtp_down'));

    const response = await PATCH(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims/claim-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved_rejected',
          outcome: 'rejected',
          resolutionNotes: 'Not validated',
        }),
      }),
      { params: Promise.resolve({ id: 'claim-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(false);
  });
});
