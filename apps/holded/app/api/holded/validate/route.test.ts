/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/holded-integration', () => ({
  __esModule: true,
  probeHoldedConnection: jest.fn(),
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { probeHoldedConnection } from '@/app/lib/holded-integration';
import { POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockProbeHoldedConnection = probeHoldedConnection as jest.Mock;

describe('POST /api/holded/validate', () => {
  const originalSessionSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_SECRET = 'test-session-secret';

    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: 'ana@example.com',
    });
    mockProbeHoldedConnection.mockResolvedValue({
      ok: true,
      invoiceApi: { ok: true, status: 200 },
      accountingApi: { ok: true, status: 200 },
      crmApi: { ok: false, status: 403 },
      projectsApi: { ok: false, status: 403 },
      teamApi: { ok: false, status: 403 },
      error: null,
    });
  });

  afterAll(() => {
    process.env.SESSION_SECRET = originalSessionSecret;
  });

  it('returns a short-lived validation token after a successful probe', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          channel: 'chatgpt',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(typeof payload.validationToken).toBe('string');
    expect(payload.validationToken.length).toBeGreaterThan(20);
  });
});
