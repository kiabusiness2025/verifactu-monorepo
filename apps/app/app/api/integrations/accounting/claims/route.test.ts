/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  listClaims: jest.fn(),
  createClaim: jest.fn(),
  getTenantHoldedContext: jest.fn(),
}));

jest.mock('@/lib/email/holdedGovernanceEmails', () => ({
  sendClaimCreatedEmails: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendClaimCreatedEmails } from '@/lib/email/holdedGovernanceEmails';
import {
  createClaim,
  getTenantHoldedContext,
  listClaims,
} from '@/lib/integrations/holdedGovernanceService';

describe('accounting claims route', () => {
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
        underClaimReview: true,
      },
      availableActions: {
        openClaim: { blocked: false, reason: 'ok', state: 'connected' },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists claims', async () => {
    (listClaims as jest.Mock).mockResolvedValue([
      {
        claimId: 'claim-1',
        connectionId: 'connection-1',
        claimType: 'control',
        status: 'submitted',
        reason: 'Owner mismatch',
        scope: null,
        requiresInternalReview: true,
        createdBy: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
        createdAt: '2026-04-11T12:00:00.000Z',
        resolvedAt: null,
        outcome: null,
      },
    ]);

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.availableActions.openClaim.blocked).toBe(false);
  });

  it('creates a claim and returns governance flags', async () => {
    (createClaim as jest.Mock).mockResolvedValue({
      claimId: 'claim-2',
      connectionId: 'connection-1',
      claimType: 'control',
      status: 'submitted',
      reason: 'Mismatch',
      scope: null,
      requiresInternalReview: true,
      createdBy: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
      createdAt: '2026-04-11T12:00:00.000Z',
      resolvedAt: null,
      outcome: null,
    });
    (sendClaimCreatedEmails as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          claimType: 'control',
          reason: 'Mismatch',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(true);
    expect(payload.claim.claimId).toBe('claim-2');
    expect(payload.governanceFlags.underClaimReview).toBe(true);
  });

  it('keeps claim creation successful when notification delivery fails', async () => {
    (createClaim as jest.Mock).mockResolvedValue({
      claimId: 'claim-2',
      connectionId: 'connection-1',
      claimType: 'control',
      status: 'submitted',
      reason: 'Mismatch',
      scope: null,
      requiresInternalReview: true,
      createdBy: { userId: 'user-1', name: 'Requester', email: 'requester@example.com' },
      createdAt: '2026-04-11T12:00:00.000Z',
      resolvedAt: null,
      outcome: null,
    });
    (sendClaimCreatedEmails as jest.Mock).mockRejectedValue(new Error('smtp_down'));

    const response = await POST(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          claimType: 'control',
          reason: 'Mismatch',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(false);
  });

  it('blocks claim creation when openClaim is already blocked by governance', async () => {
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      governanceFlags: {
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: true,
        highGovernanceRisk: false,
        underClaimReview: true,
      },
      availableActions: {
        openClaim: {
          blocked: true,
          reason: 'Ya existe una reclamacion en revision para esta conexion.',
          state: 'under_claim_review',
        },
      },
    });

    const response = await POST(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          claimType: 'control',
          reason: 'Mismatch',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('Ya existe una reclamacion en revision');
    expect(payload.availableActions.openClaim.blocked).toBe(true);
    expect(createClaim).not.toHaveBeenCalled();
  });
});
