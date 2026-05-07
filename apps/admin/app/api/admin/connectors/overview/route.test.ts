/** @jest-environment node */

/**
 * Tests F6.2b — endpoint que alimenta la pagina /admin/connectors/overview.
 *  - 403 si requireAdmin lanza FORBIDDEN
 *  - happy path: timeline + errors24h + topTools + recentEvents
 *  - tolera arrays vacios sin romper
 */

const requireAdminMock = jest.fn();
const oneMock = jest.fn();
const queryMock = jest.fn();

jest.mock('@/lib/adminAuth', () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));

jest.mock('@/lib/db', () => ({
  one: (...args: unknown[]) => oneMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
}));

import { GET } from './route';

function buildRequest() {
  return new Request('http://localhost/api/admin/connectors/overview', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAdminMock.mockResolvedValue({ uid: 'admin-1' });
  queryMock.mockReset();
});

describe('GET /api/admin/connectors/overview', () => {
  it('responde 403 si requireAdmin lanza FORBIDDEN', async () => {
    requireAdminMock.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await GET(buildRequest());
    expect(res.status).toBe(403);
  });

  it('happy path: combina timeline, errors24h, topTools y recentEvents', async () => {
    queryMock
      .mockResolvedValueOnce([
        { bucket: '2026-05-01', channel_key: 'chatgpt', count: 3 },
        { bucket: '2026-05-01', channel_key: 'claude', count: 1 },
        { bucket: '2026-05-02', channel_key: 'dashboard', count: 2 },
      ])
      .mockResolvedValueOnce([
        {
          id: 'conn-1',
          tenant_id: 'tenant-1',
          tenant_legal_name: 'Acme SL',
          channel_key: 'chatgpt',
          last_error: 'Holded API timeout',
          updated_at: '2026-05-07T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          tool_name: 'create_invoice_draft',
          channel: 'claude',
          calls: 12,
          errors: 1,
          last_used_at: '2026-05-07T10:30:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          source: 'connection',
          occurred_at: '2026-05-07T09:00:00Z',
          tenant_id: 'tenant-1',
          tenant_legal_name: 'Acme SL',
          action: 'connected',
          channel: 'chatgpt',
          detail: 'connection #conn-1',
          status: 'success',
        },
        {
          source: 'mcp',
          occurred_at: '2026-05-07T09:30:00Z',
          tenant_id: 'tenant-2',
          tenant_legal_name: 'Beta SL',
          action: 'used',
          channel: 'claude',
          detail: 'list_contacts',
          status: '200',
        },
      ]);

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeline).toHaveLength(3);
    expect(body.timeline[0]).toMatchObject({
      bucket: '2026-05-01',
      channelKey: 'chatgpt',
      count: 3,
    });
    expect(body.errors24h).toHaveLength(1);
    expect(body.errors24h[0].lastError).toBe('Holded API timeout');
    expect(body.topTools[0].toolName).toBe('create_invoice_draft');
    expect(body.recentEvents).toHaveLength(2);
    expect(body.recentEvents[1].source).toBe('mcp');
  });

  it('responde con arrays vacios si no hay datos', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeline).toEqual([]);
    expect(body.errors24h).toEqual([]);
    expect(body.topTools).toEqual([]);
    expect(body.recentEvents).toEqual([]);
  });

  it('500 si la query explota', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'));
    const res = await GET(buildRequest());
    expect(res.status).toBe(500);
  });
});
