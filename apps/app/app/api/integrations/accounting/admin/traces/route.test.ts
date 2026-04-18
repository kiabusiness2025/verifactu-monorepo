/** @jest-environment node */

jest.mock('@/lib/adminAuth', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedConnectorTraceService', () => ({
  listHoldedConnectorAdminTrace: jest.fn(),
}));

import { GET } from './route';
import { requireAdmin } from '@/lib/adminAuth';
import { listHoldedConnectorAdminTrace } from '@/lib/integrations/holdedConnectorTraceService';

describe('GET /api/integrations/accounting/admin/traces', () => {
  beforeEach(() => {
    (requireAdmin as jest.Mock).mockResolvedValue({ ok: true });
    (listHoldedConnectorAdminTrace as jest.Mock).mockResolvedValue({
      summary: {
        activeSessions: 1,
        recentConversations: 1,
        memoryFacts: 2,
      },
      activeSessions: [
        {
          sessionId: 'session-1',
          userId: 'user-1',
          userEmail: 'admin@cliente.es',
          userName: 'Admin Cliente',
          expiresAt: '2026-04-18T10:00:00.000Z',
          tenants: [],
        },
      ],
      recentConversations: [
        {
          conversationId: 'conv-1',
          tenantId: 'tenant-1',
          tenantName: 'Acme SL',
          tenantLegalName: 'Acme Sociedad Limitada',
          userId: 'user-1',
          userEmail: 'admin@cliente.es',
          userName: 'Admin Cliente',
          title: 'Revision de facturas',
          context: null,
          summary: 'Resumen',
          messageCount: 4,
          lastActivity: '2026-04-18T09:00:00.000Z',
          recentMessages: [],
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns connector sessions and conversation traces for admin', async () => {
    const response = await GET(
      new Request(
        'https://app.verifactu.business/api/integrations/accounting/admin/traces?sessionLimit=10&conversationLimit=15'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(requireAdmin).toHaveBeenCalled();
    expect(listHoldedConnectorAdminTrace).toHaveBeenCalledWith({
      sessionLimit: 10,
      conversationLimit: 15,
    });
    expect(payload.summary).toEqual({
      activeSessions: 1,
      recentConversations: 1,
      memoryFacts: 2,
    });
    expect(payload.activeSessions[0].userEmail).toBe('admin@cliente.es');
    expect(payload.recentConversations[0].title).toBe('Revision de facturas');
  });

  it('returns 403 when admin access is missing', async () => {
    (requireAdmin as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));

    const response = await GET(
      new Request('https://app.verifactu.business/api/integrations/accounting/admin/traces')
    );

    expect(response.status).toBe(403);
    expect(listHoldedConnectorAdminTrace).not.toHaveBeenCalled();
  });
});
