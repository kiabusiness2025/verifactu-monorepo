/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  updateRecipient: jest.fn(),
  removeRecipient: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { DELETE, PATCH } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { removeRecipient, updateRecipient } from '@/lib/integrations/holdedGovernanceService';

describe('accounting recipient detail route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates a recipient', async () => {
    (updateRecipient as jest.Mock).mockResolvedValue({
      recipientId: 'recipient-1',
      email: 'client@example.com',
      recipientType: 'client_contact',
      isMandatory: true,
      isClientSide: true,
      isConfirmed: true,
      createdByUserId: 'user-1',
    });

    const response = await PATCH(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/recipients/recipient-1',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isConfirmed: true }),
        }
      ),
      { params: Promise.resolve({ id: 'recipient-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.recipient.recipientId).toBe('recipient-1');
  });

  it('returns a conflict when deleting the last mandatory recipient', async () => {
    (removeRecipient as jest.Mock).mockRejectedValue(new Error('last_mandatory_recipient'));

    const response = await DELETE(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/recipients/recipient-1',
        {
          method: 'DELETE',
        }
      ),
      { params: Promise.resolve({ id: 'recipient-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('ultimo destinatario obligatorio');
  });
});
