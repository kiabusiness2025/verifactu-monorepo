/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  listRecipients: jest.fn(),
  createRecipient: jest.fn(),
  getTenantHoldedContext: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  createRecipient,
  getTenantHoldedContext,
  listRecipients,
} from '@/lib/integrations/holdedGovernanceService';

describe('accounting recipients route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      availableActions: {
        manageRecipients: { blocked: false, reason: 'ok', state: 'connected' },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists recipients and available actions', async () => {
    (listRecipients as jest.Mock).mockResolvedValue({
      connection: { id: 'conn-1' },
      items: [
        {
          recipientId: 'recipient-1',
          email: 'client@example.com',
          recipientType: 'client_contact',
          isMandatory: true,
          isClientSide: true,
          isConfirmed: true,
          createdByUserId: 'user-1',
        },
      ],
    });

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/recipients')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.availableActions.manageRecipients.blocked).toBe(false);
  });

  it('creates a recipient', async () => {
    (createRecipient as jest.Mock).mockResolvedValue({
      recipientId: 'recipient-2',
      email: 'ops@example.com',
      recipientType: 'ops',
      isMandatory: false,
      isClientSide: false,
      isConfirmed: false,
      createdByUserId: 'user-1',
    });

    const response = await POST(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/recipients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'ops@example.com',
          recipientType: 'ops',
          isMandatory: false,
          isClientSide: false,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.recipient).toMatchObject({
      email: 'ops@example.com',
      recipientType: 'ops',
    });
  });
});
