/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  disconnectAccountingIntegration: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/holdedConnectionEmails', () => ({
  sendHoldedConnectionLifecycleEmails: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';

describe('POST /api/integrations/accounting/disconnect', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'demo@example.com', name: 'Demo User' },
    });
    (disconnectAccountingIntegration as jest.Mock).mockResolvedValue({ status: 'disconnected' });
    (
      (prisma as unknown as { tenant: { findUnique: jest.Mock } }).tenant.findUnique as jest.Mock
    ).mockResolvedValue({ name: 'Empresa Demo SL' });
    (sendHoldedConnectionLifecycleEmails as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disconnects the dashboard channel and sends notifications', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/disconnect',
      {
        method: 'POST',
        headers: { 'x-isaak-entry-channel': 'dashboard' },
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('disconnected');
    expect(disconnectAccountingIntegration).toHaveBeenCalledWith('tenant-1', 'dashboard');
    expect(sendHoldedConnectionLifecycleEmails).toHaveBeenCalledWith({
      userEmail: 'demo@example.com',
      userName: 'Demo User',
      tenantName: 'Empresa Demo SL',
      action: 'disconnected',
      channel: 'dashboard',
    });
  });
});
