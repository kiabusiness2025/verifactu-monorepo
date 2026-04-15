/** @jest-environment node */

jest.mock('@/lib/adminAuth', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    membership: {
      findMany: jest.fn(),
    },
  },
}));

import { GET } from './route';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

describe('accounting admin user-tenants route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAdmin as jest.Mock).mockResolvedValue({
      email: 'soporte@verifactu.business',
      userId: 'admin-1',
    });
  });

  it('returns user-tenant rows with holded connection status', async () => {
    (prisma.membership.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'm-1',
        userId: 'u-1',
        tenantId: 't-1',
        role: 'company_admin',
        status: 'active',
        side: 'client',
        tenant: {
          id: 't-1',
          name: 'Acme SL',
          legalName: 'Acme Sociedad Limitada',
          externalConnections: [
            {
              id: 'c-1',
              connectionStatus: 'connected',
              channelKey: 'dashboard',
              updatedAt: new Date('2026-04-15T10:00:00.000Z'),
              lastValidatedAt: new Date('2026-04-15T09:00:00.000Z'),
              lastSyncAt: new Date('2026-04-15T09:30:00.000Z'),
              managedByThirdParty: false,
              clientAdminGap: false,
              highGovernanceRisk: false,
            },
          ],
        },
        user: {
          id: 'u-1',
          email: 'admin@acme.es',
          name: 'Ana',
        },
      },
    ]);

    const response = await GET(
      new Request('https://app.verifactu.business/api/integrations/accounting/admin/user-tenants')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.total).toBe(1);
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        userEmail: 'admin@acme.es',
        tenantName: 'Acme SL',
        connectionStatus: 'connected',
      })
    );
  });

  it('returns 403 when requester is not admin', async () => {
    (requireAdmin as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

    const response = await GET(
      new Request('https://app.verifactu.business/api/integrations/accounting/admin/user-tenants')
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain('FORBIDDEN');
  });
});
