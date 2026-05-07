/** @jest-environment node */

/**
 * Tests F6.1 — admin revoke endpoint. Verifica:
 *  - requireAdmin gate
 *  - 404 si la conexion no pertenece al tenant
 *  - 400 si el provider no es 'holded'
 *  - idempotente cuando la conexion ya esta revoked_api
 *  - happy path: actualiza estado a revoked_api y limpia api_key
 *  - audit log se intenta (best effort)
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

import { POST } from './route';

function buildRequest(body: unknown = {}) {
  return new Request('http://localhost/api/admin/tenants/tenant-1/connectors/conn-1/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'tenant-1', connectionId: 'conn-1' });

beforeEach(() => {
  jest.clearAllMocks();
  requireAdminMock.mockResolvedValue({ uid: 'admin-1' });
  oneMock.mockReset();
  queryMock.mockReset();
});

describe('POST /api/admin/tenants/[id]/connectors/[connectionId]/revoke', () => {
  it('responde 403 si requireAdmin lanza FORBIDDEN', async () => {
    requireAdminMock.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await POST(buildRequest(), { params });
    expect(res.status).toBe(403);
  });

  it('404 si la conexion no existe para el tenant', async () => {
    oneMock.mockResolvedValueOnce(null);
    const res = await POST(buildRequest(), { params });
    expect(res.status).toBe(404);
    expect(oneMock).toHaveBeenCalledTimes(1);
  });

  it('400 si la conexion no es de provider=holded', async () => {
    oneMock.mockResolvedValueOnce({
      id: 'conn-1',
      tenant_id: 'tenant-1',
      provider: 'stripe',
      channel_key: 'dashboard',
      connection_status: 'connected',
    });
    const res = await POST(buildRequest(), { params });
    expect(res.status).toBe(400);
  });

  it('responde idempotente si ya estaba revocada', async () => {
    oneMock.mockResolvedValueOnce({
      id: 'conn-1',
      tenant_id: 'tenant-1',
      provider: 'holded',
      channel_key: 'claude',
      connection_status: 'revoked_api',
    });
    const res = await POST(buildRequest(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alreadyRevoked).toBe(true);
    // No deberia haberse intentado el UPDATE
    expect(oneMock).toHaveBeenCalledTimes(1);
  });

  it('happy path: revoca y devuelve estado, intenta audit log', async () => {
    oneMock
      .mockResolvedValueOnce({
        id: 'conn-1',
        tenant_id: 'tenant-1',
        provider: 'holded',
        channel_key: 'claude',
        connection_status: 'connected',
      })
      .mockResolvedValueOnce({
        id: 'conn-1',
        tenant_id: 'tenant-1',
        connection_status: 'revoked_api',
        revoked_at: '2026-05-06T12:00:00Z',
        channel_key: 'claude',
      });
    queryMock.mockResolvedValueOnce([]);

    const res = await POST(buildRequest({ reason: 'security_audit' }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      connectionId: 'conn-1',
      status: 'revoked_api',
      channelKey: 'claude',
    });
    // Verificar que el UPDATE incluye reason en last_error
    const updateCall = oneMock.mock.calls[1];
    expect(String(updateCall[0])).toMatch(/UPDATE external_connections/);
    expect(updateCall[1][2]).toContain('security_audit');
    // Audit log call hecho
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(String(queryMock.mock.calls[0][0])).toMatch(/INSERT INTO external_connection_audit_log/);
  });

  it('si el audit log falla, sigue devolviendo ok=true', async () => {
    oneMock
      .mockResolvedValueOnce({
        id: 'conn-1',
        tenant_id: 'tenant-1',
        provider: 'holded',
        channel_key: 'claude',
        connection_status: 'connected',
      })
      .mockResolvedValueOnce({
        id: 'conn-1',
        tenant_id: 'tenant-1',
        connection_status: 'revoked_api',
        revoked_at: '2026-05-06T12:00:00Z',
        channel_key: 'claude',
      });
    queryMock.mockRejectedValueOnce(new Error('audit table missing'));

    const res = await POST(buildRequest(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
