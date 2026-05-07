/** @jest-environment node */

/**
 * Tests F6.2a — endpoint que alimenta las KPI cards globales.
 *  - 403 si requireAdmin lanza FORBIDDEN
 *  - happy path: agrega totales y desglose por canal
 *  - tolera channel_key NULL (lo trata como 'dashboard')
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
  return new Request('http://localhost/api/admin/connectors/summary', { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAdminMock.mockResolvedValue({ uid: 'admin-1' });
  oneMock.mockReset();
  queryMock.mockReset();
});

describe('GET /api/admin/connectors/summary', () => {
  it('responde 403 si requireAdmin lanza FORBIDDEN', async () => {
    requireAdminMock.mockRejectedValue(new Error('FORBIDDEN'));
    const res = await GET(buildRequest());
    expect(res.status).toBe(403);
  });

  it('agrega totales y desglose por canal', async () => {
    oneMock.mockResolvedValueOnce({
      total: 12,
      connected: 8,
      errors: 2,
      revoked: 1,
      disconnected: 1,
      errors_24h: 1,
      active_last_24h: 6,
      active_last_7d: 10,
    });
    queryMock.mockResolvedValueOnce([
      { channel_key: 'dashboard', total: 4, connected: 3, errors: 0, revoked: 1 },
      { channel_key: 'chatgpt', total: 5, connected: 4, errors: 1, revoked: 0 },
      { channel_key: 'claude', total: 3, connected: 1, errors: 1, revoked: 0 },
    ]);

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals).toMatchObject({
      total: 12,
      connected: 8,
      errors24h: 1,
      activeLast24h: 6,
    });
    expect(body.byChannel.dashboard.total).toBe(4);
    expect(body.byChannel.chatgpt.connected).toBe(4);
    expect(body.byChannel.claude.errors).toBe(1);
    // mobile no aparece en la respuesta SQL: deberia quedar en zeros.
    expect(body.byChannel.mobile.total).toBe(0);
  });

  it('trata channel_key NULL como dashboard', async () => {
    oneMock.mockResolvedValueOnce({
      total: 1,
      connected: 1,
      errors: 0,
      revoked: 0,
      disconnected: 0,
      errors_24h: 0,
      active_last_24h: 1,
      active_last_7d: 1,
    });
    // SQL ya hace COALESCE — pero validamos que el handler no rompe si llega
    // un row con channel_key = null.
    queryMock.mockResolvedValueOnce([
      { channel_key: null, total: 1, connected: 1, errors: 0, revoked: 0 },
    ]);

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    // El COALESCE se hace en SQL, asi que aqui llegaria como 'dashboard'
    // si la query estuviera ejecutada de verdad. El mock pasa null y el
    // handler lo cae a 'dashboard' tambien.
    expect(body.byChannel.dashboard.total).toBe(1);
  });

  it('500 si la query del summary explota', async () => {
    oneMock.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(buildRequest());
    expect(res.status).toBe(500);
  });
});
