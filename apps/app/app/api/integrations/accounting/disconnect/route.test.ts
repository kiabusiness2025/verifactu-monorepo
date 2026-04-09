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

jest.mock('@/lib/email/holdedSecurityAlerts', () => ({
  resolveHoldedSecurityAlertRecipients: jest.fn(async () => [
    { email: 'demo@example.com', name: 'Demo User', source: 'membership' },
    { email: 'empresa@example.com', name: null, source: 'tenant_profile' },
  ]),
  sendHoldedSecurityAlertEmails: jest.fn(async () => []),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import {
  resolveHoldedSecurityAlertRecipients,
  sendHoldedSecurityAlertEmails,
} from '@/lib/email/holdedSecurityAlerts';

describe('POST /api/integrations/accounting/disconnect', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'demo@example.com', name: 'Demo User' },
    });
    (disconnectAccountingIntegration as jest.Mock).mockResolvedValue({ status: 'disconnected' });
    (
      (prisma as unknown as { tenant: { findUnique: jest.Mock } }).tenant.findUnique as jest.Mock
    ).mockResolvedValue({
      name: 'Empresa Demo SL',
      legalName: 'Empresa Demo SL',
      profile: {
        legalName: 'Empresa Demo SL',
        tradeName: 'Empresa Demo',
        email: 'empresa@example.com',
        phone: '+34 600 000 000',
      },
    });
    (sendHoldedConnectionLifecycleEmails as jest.Mock).mockResolvedValue([]);
    (resolveHoldedSecurityAlertRecipients as jest.Mock).mockResolvedValue([
      { email: 'demo@example.com', name: 'Demo User', source: 'membership' },
      { email: 'empresa@example.com', name: null, source: 'tenant_profile' },
    ]);
    (sendHoldedSecurityAlertEmails as jest.Mock).mockResolvedValue([]);
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
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      contactName: 'Demo User',
      contactEmail: 'demo@example.com',
      companyEmail: 'empresa@example.com',
      contactPhone: '+34 600 000 000',
      action: 'disconnected',
      channel: 'dashboard',
    });
    expect(resolveHoldedSecurityAlertRecipients).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorEmail: 'demo@example.com',
      actorName: 'Demo User',
    });
    expect(sendHoldedSecurityAlertEmails).toHaveBeenCalledWith({
      recipients: [
        { email: 'demo@example.com', name: 'Demo User', source: 'membership' },
        { email: 'empresa@example.com', name: null, source: 'tenant_profile' },
      ],
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      actorEmail: 'demo@example.com',
      actorName: 'Demo User',
      action: 'disconnected',
      channel: 'dashboard',
    });
  });
});
