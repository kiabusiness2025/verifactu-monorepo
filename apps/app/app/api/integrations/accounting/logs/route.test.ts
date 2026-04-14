/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  listSyncLogs: jest.fn(),
  listSyncConflicts: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  listClaims: jest.fn(),
  listAccessRequests: jest.fn(),
  getTenantHoldedContext: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { listSyncConflicts, listSyncLogs } from '@/lib/integrations/accountingStore';
import {
  getTenantHoldedContext,
  listAccessRequests,
  listClaims,
} from '@/lib/integrations/holdedGovernanceService';

describe('GET /api/integrations/accounting/logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireTenantContext as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (listSyncConflicts as jest.Mock).mockResolvedValue([]);
    (listClaims as jest.Mock).mockResolvedValue([]);
    (listAccessRequests as jest.Mock).mockResolvedValue([]);
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      governanceFlags: {
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: false,
        highGovernanceRisk: false,
        underClaimReview: false,
      },
      availableActions: {
        disconnect: { blocked: false, reason: 'ok' },
        manageMembers: { blocked: false, reason: 'ok' },
        manageRecipients: { blocked: false, reason: 'ok' },
        openClaim: { blocked: false, reason: 'ok' },
      },
    });
  });

  it('returns sync logs with request id header', async () => {
    (listSyncLogs as jest.Mock).mockResolvedValue([
      { id: 'log-1', level: 'info', message: 'SYNC_OK invoice:inv-1' },
    ]);

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/logs?limit=1')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.items).toHaveLength(1);
    expect(payload.requestId).toBeTruthy();
    expect(payload.nextCursor).toBe('log-1');
  });

  it('returns 500 when sync logs lookup fails', async () => {
    (listSyncLogs as jest.Mock).mockRejectedValue(new Error('db_down'));

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/logs')
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.error).toBe('No se pudieron cargar los logs de sincronizacion.');
  });

  it('returns consolidated observability summary mode', async () => {
    (listSyncLogs as jest.Mock).mockResolvedValue([
      {
        id: 'log-1',
        outbox_id: null,
        level: 'warn',
        message: 'QUOTE_CONFLICT quote-1',
        data: { requestId: 'trace-123' },
        created_at: '2026-04-14T10:00:00.000Z',
      },
      {
        id: 'log-2',
        outbox_id: null,
        level: 'error',
        message: 'SYNC_ERROR quote:1',
        data: null,
        created_at: '2026-04-14T10:01:00.000Z',
      },
      {
        id: 'log-3',
        outbox_id: null,
        level: 'info',
        message: 'SYNC_OK quote:2',
        data: null,
        created_at: '2026-04-14T10:02:00.000Z',
      },
    ]);
    (listSyncConflicts as jest.Mock).mockResolvedValue([{ id: 'conflict-1' }]);
    (listClaims as jest.Mock).mockResolvedValue([
      { claimId: 'c1', status: 'submitted' },
      { claimId: 'c2', status: 'resolved' },
    ]);
    (listAccessRequests as jest.Mock).mockResolvedValue([
      { requestId: 'ar1', status: 'submitted' },
      { requestId: 'ar2', status: 'approved' },
    ]);
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      governanceFlags: {
        ownershipStatus: 'third_party_managed',
        managedByThirdParty: true,
        clientAdminGap: true,
        highGovernanceRisk: true,
        underClaimReview: true,
      },
      availableActions: {
        disconnect: { blocked: true, reason: 'blocked disconnect' },
        manageMembers: { blocked: false, reason: 'ok' },
        manageRecipients: { blocked: true, reason: 'blocked recipients' },
        openClaim: { blocked: true, reason: 'blocked claim' },
      },
    });

    const response = await GET(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/logs?mode=summary&summaryLimit=120'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mode).toBe('summary');
    expect(payload.summary.sync.total).toBe(3);
    expect(payload.summary.sync.warnings).toBe(1);
    expect(payload.summary.sync.errors).toBe(1);
    expect(payload.summary.conflicts.quotes).toBe(1);
    expect(payload.summary.claims.open).toBe(1);
    expect(payload.summary.accessRequests.pending).toBe(1);
    expect(payload.summary.governance.blockedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'disconnect' }),
        expect.objectContaining({ action: 'manageRecipients' }),
        expect.objectContaining({ action: 'openClaim' }),
      ])
    );
    expect(payload.incidents).toHaveLength(2);
    expect(payload.incidents[0].requestId).toBe('trace-123');
  });

  it('returns 500 when summary lookup fails', async () => {
    (listSyncConflicts as jest.Mock).mockRejectedValue(new Error('db_down'));

    const response = await GET(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/logs?mode=summary'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('No se pudo cargar el resumen de observabilidad.');
  });
});
