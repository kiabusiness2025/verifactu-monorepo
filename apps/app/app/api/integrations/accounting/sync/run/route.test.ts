/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  canUseAccountingIntegration: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  appendSyncLog: jest.fn(),
  getPendingOutbox: jest.fn(),
  markOutboxDone: jest.fn(),
  markOutboxError: jest.fn(),
  setIntegrationError: jest.fn(),
  touchIntegrationSyncOk: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canUseAccountingIntegration } from '@/lib/billing/tenantPlan';
import {
  appendSyncLog,
  getPendingOutbox,
  markOutboxDone,
  markOutboxError,
  setIntegrationError,
  touchIntegrationSyncOk,
} from '@/lib/integrations/accountingStore';

describe('POST /api/integrations/accounting/sync/run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireTenantContext as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (canUseAccountingIntegration as jest.Mock).mockResolvedValue(true);
    (getPendingOutbox as jest.Mock).mockResolvedValue([]);
    (appendSyncLog as jest.Mock).mockResolvedValue(undefined);
    (markOutboxDone as jest.Mock).mockResolvedValue(undefined);
    (markOutboxError as jest.Mock).mockResolvedValue(undefined);
  });

  it('updates sync success only for the request channel', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/sync/run',
      {
        method: 'POST',
        headers: {
          'x-isaak-entry-channel': 'chatgpt',
        },
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.ok).toBe(true);
    expect(requireTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({ channelType: 'chatgpt' })
    );
    expect(touchIntegrationSyncOk).toHaveBeenCalledWith('tenant-1', 'chatgpt');
    expect(setIntegrationError).not.toHaveBeenCalled();
  });

  it('updates sync errors only for the request channel', async () => {
    (getPendingOutbox as jest.Mock).mockResolvedValue([
      {
        id: 'outbox-1',
        entity_type: 'invoice',
        entity_id: 'inv-1',
        action: 'upsert',
      },
    ]);
    (markOutboxDone as jest.Mock).mockRejectedValue(new Error('sync failed'));

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/sync/run',
      {
        method: 'POST',
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(false);
    expect(setIntegrationError).toHaveBeenCalledWith(
      'tenant-1',
      '1 elementos en error durante sync manual',
      'dashboard'
    );
    expect(touchIntegrationSyncOk).not.toHaveBeenCalled();
  });

  it('returns 500 when sync execution fails before processing outbox', async () => {
    (getPendingOutbox as jest.Mock).mockRejectedValue(new Error('db_down'));

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/sync/run',
      {
        method: 'POST',
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.error).toBe('No se pudo ejecutar la sincronizacion manual.');
  });
});
