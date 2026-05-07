/** @jest-environment node */

/**
 * Tests F6.4 — endpoint que alimenta /admin/tenants/[id]/audit. Verifica:
 *  - 403 si requireAdmin lanza FORBIDDEN
 *  - happy path: combina ec + mcp eventos en orden DESC
 *  - filtros action/channel/since se pasan a la query
 *  - limit clamped a [1, 200]
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

function buildRequest(searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/tenants/tenant-1/audit-log');
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: 'GET' });
}

const params = Promise.resolve({ id: 'tenant-1' });

beforeEach(() => {
  jest.clearAllMocks();
  requireAdminMock.mockResolvedValue({ uid: 'admin-1' });
  queryMock.mockReset();
});

describe('GET /api/admin/tenants/[id]/audit-log', () => {
  it('responde 403 si requireAdmin lanza FORBIDDEN', async () => {
    requireAdminMock.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await GET(buildRequest(), { params });
    expect(res.status).toBe(403);
  });

  it('happy path: combina events y aplica defaults', async () => {
    queryMock.mockResolvedValueOnce([
      {
        source: 'connection',
        occurred_at: '2026-05-07T09:00:00Z',
        tenant_id: 'tenant-1',
        ref_id: 'conn-1',
        user_id: 'user-1',
        user_email: 'foo@acme.com',
        user_name: 'Foo Bar',
        action: 'connected',
        channel: 'chatgpt',
        detail: 'connection #conn-1',
        status: 'success',
        ip: null,
        user_agent: null,
        meta: null,
      },
      {
        source: 'mcp',
        occurred_at: '2026-05-07T10:00:00Z',
        tenant_id: 'tenant-1',
        ref_id: 'pat-1',
        user_id: null,
        user_email: null,
        user_name: null,
        action: 'used',
        channel: 'claude',
        detail: 'create_invoice_draft',
        status: '200',
        ip: '1.2.3.4',
        user_agent: 'Claude/1.0',
        meta: { tool: 'create_invoice_draft' },
      },
    ]);

    const res = await GET(buildRequest(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantId).toBe('tenant-1');
    expect(body.filters.limit).toBe(100); // default
    expect(body.items).toHaveLength(2);
    expect(body.items[0].source).toBe('connection');
    expect(body.items[1].user).toBeNull();
    expect(body.items[1].ip).toBe('1.2.3.4');
  });

  it('aplica filtros action/channel/since al query', async () => {
    queryMock.mockResolvedValueOnce([]);
    const sinceIso = '2026-05-01T00:00:00.000Z';
    const res = await GET(
      buildRequest({ action: 'used', channel: 'claude', since: sinceIso, limit: '50' }),
      { params }
    );
    expect(res.status).toBe(200);
    const callArgs = queryMock.mock.calls[0][1] as unknown[];
    expect(callArgs[0]).toBe('tenant-1');
    expect(callArgs[1]).toBe(sinceIso);
    expect(callArgs[2]).toBe('%used%');
    expect(callArgs[3]).toBe('%claude%');
    expect(callArgs[4]).toBe(50);
  });

  it('clamp del limit fuera de rango', async () => {
    queryMock.mockResolvedValueOnce([]);
    const res = await GET(buildRequest({ limit: '9999' }), { params });
    expect(res.status).toBe(200);
    const callArgs = queryMock.mock.calls[0][1] as unknown[];
    expect(callArgs[4]).toBe(200);
  });

  it('500 si la query explota', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(buildRequest(), { params });
    expect(res.status).toBe(500);
  });
});
