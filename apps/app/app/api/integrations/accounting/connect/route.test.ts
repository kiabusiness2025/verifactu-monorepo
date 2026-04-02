/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  getAccountingIntegrationAccess: jest.fn(),
}));

jest.mock('@/lib/integrations/accounting', () => ({
  encryptIntegrationSecret: jest.fn(() => 'encrypted-demo-key'),
  maskSecret: jest.fn(() => 'demo****key'),
  probeAccountingApiConnection: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  upsertAccountingIntegration: jest.fn(),
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
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';

describe('POST /api/integrations/accounting/connect', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'demo@example.com', name: 'Demo User' },
    });
    (getAccountingIntegrationAccess as jest.Mock).mockResolvedValue({
      canConnect: true,
      connectionMode: 'holded_first',
      planCode: 'empresa',
    });
    (probeAccountingApiConnection as jest.Mock).mockResolvedValue({ ok: true });
    (upsertAccountingIntegration as jest.Mock).mockResolvedValue({
      status: 'connected',
      last_sync_at: null,
      last_error: null,
    });
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects the connection when legal acceptance is incomplete', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: false,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Debes aceptar los Terminos y la Politica de Privacidad');
    expect(probeAccountingApiConnection).not.toHaveBeenCalled();
    expect(upsertAccountingIntegration).not.toHaveBeenCalled();
  });

  it('connects when terms and privacy are accepted', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/connect',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-isaak-entry-channel': 'chatgpt',
        },
        body: JSON.stringify({
          apiKey: 'demo-key',
          acceptedTerms: true,
          acceptedPrivacy: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(probeAccountingApiConnection).toHaveBeenCalledWith('demo-key');
    expect(upsertAccountingIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        connectedByUserId: 'user-1',
        channelKey: 'chatgpt',
        legalAcceptanceVersion: 'holded_connection_v1',
      })
    );
    expect(sendHoldedConnectionLifecycleEmails).toHaveBeenCalledWith({
      userEmail: 'demo@example.com',
      userName: 'Demo User',
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      contactName: 'Demo User',
      contactEmail: 'demo@example.com',
      companyEmail: 'empresa@example.com',
      contactPhone: '+34 600 000 000',
      action: 'connected',
      channel: 'chatgpt',
    });
  });
});
