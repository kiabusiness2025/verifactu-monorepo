/** @jest-environment node */

/**
 * Tests F6.3 — busqueda admin por nombre de empresa o usuario.
 *  - 403 si requireAdmin lanza FORBIDDEN
 *  - 400 si el query es < 2 chars
 *  - happy path: aplica ILIKE y devuelve tenants + users
 *  - tolera tenants/users vacios sin romper
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

function buildRequest(q: string) {
  const url = new URL('http://localhost/api/admin/connectors/search');
  url.searchParams.set('q', q);
  return new Request(url.toString(), { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAdminMock.mockResolvedValue({ uid: 'admin-1' });
  queryMock.mockReset();
});

describe('GET /api/admin/connectors/search', () => {
  it('responde 403 si requireAdmin lanza FORBIDDEN', async () => {
    requireAdminMock.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await GET(buildRequest('acme'));
    expect(res.status).toBe(403);
  });

  it('responde 400 si el query es < 2 chars', async () => {
    const res = await GET(buildRequest('a'));
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('happy path: aplica ILIKE y devuelve tenants + users', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 'tenant-1',
          name: 'Acme',
          legal_name: 'Acme SL',
          nif: 'B12345678',
          total_connections: 2,
          connected: 1,
          errors: 0,
          channels: ['chatgpt', 'claude'],
          last_activity_at: '2026-05-07T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'foo@acme.com',
          name: 'Foo Bar',
          first_name: 'Foo',
          last_name: 'Bar',
          total_connections: 1,
          connected: 1,
          tenants: [{ tenantId: 'tenant-1', legalName: 'Acme SL' }],
          last_activity_at: '2026-05-07T09:00:00Z',
        },
      ]);

    const res = await GET(buildRequest('acme'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe('acme');
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0]).toMatchObject({
      id: 'tenant-1',
      legalName: 'Acme SL',
      channels: ['chatgpt', 'claude'],
    });
    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toMatchObject({
      id: 'user-1',
      email: 'foo@acme.com',
      tenants: [{ tenantId: 'tenant-1', legalName: 'Acme SL' }],
    });

    // Verificar que el patron ILIKE se construyo correctamente.
    expect(queryMock.mock.calls[0][1][0]).toBe('%acme%');
    expect(queryMock.mock.calls[1][1][0]).toBe('%acme%');
  });

  it('tolera arrays vacios sin romper', async () => {
    queryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const res = await GET(buildRequest('xx'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenants).toEqual([]);
    expect(body.users).toEqual([]);
  });

  it('500 si la query explota', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(buildRequest('acme'));
    expect(res.status).toBe(500);
  });
});
