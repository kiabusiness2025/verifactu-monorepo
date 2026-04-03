/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedConnectedCommunication: jest.fn(),
}));

jest.mock('@verifactu/integrations', () => ({
  __esModule: true,
  recordUsageEvent: jest.fn(),
}));

jest.mock('@/app/lib/holded-integration', () => ({
  __esModule: true,
  disconnectHoldedConnection: jest.fn(),
  probeHoldedConnection: jest.fn(),
  saveHoldedConnection: jest.fn(),
}));

jest.mock('@/app/lib/holded-activity', () => ({
  __esModule: true,
  writeHoldedActivity: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    tenantProfile: {
      findFirst: jest.fn(),
    },
  },
}));

import { getHoldedSession } from '@/app/lib/holded-session';
import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { recordUsageEvent } from '@verifactu/integrations';
import { mintHoldedValidationToken } from '@/app/lib/holded-validation-token';
import {
  disconnectHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

const mockGetHoldedSession = getHoldedSession as jest.Mock;
const mockSendHoldedConnectedCommunication = sendHoldedConnectedCommunication as jest.Mock;
const mockRecordUsageEvent = recordUsageEvent as jest.Mock;
const mockProbeHoldedConnection = probeHoldedConnection as jest.Mock;
const mockSaveHoldedConnection = saveHoldedConnection as jest.Mock;
const mockDisconnectHoldedConnection = disconnectHoldedConnection as jest.Mock;
const mockWriteHoldedActivity = writeHoldedActivity as jest.Mock;
const mockTenantProfileFindFirst = prisma.tenantProfile.findFirst as jest.Mock;

describe('POST /api/holded/connect', () => {
  const originalSessionSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_SECRET = 'test-session-secret';

    mockGetHoldedSession.mockResolvedValue({
      tenantId: 'tenant_1',
      userId: 'user_1',
      email: null,
      name: 'Ana',
    });
    mockProbeHoldedConnection.mockResolvedValue({
      ok: true,
      invoiceApi: { ok: true, status: 200 },
      accountingApi: { ok: true, status: 200 },
      crmApi: { ok: false, status: 403 },
      projectsApi: { ok: false, status: 403 },
      teamApi: { ok: false, status: 403 },
    });
    mockSaveHoldedConnection.mockResolvedValue({
      connected: true,
      tenantName: 'Acme SL',
    });
    mockRecordUsageEvent.mockResolvedValue(undefined);
    mockSendHoldedConnectedCommunication.mockResolvedValue({
      customerEmailId: 'customer-mail-id',
      adminEmailId: 'admin-mail-id',
    });
    mockWriteHoldedActivity.mockResolvedValue(undefined);
    mockTenantProfileFindFirst.mockResolvedValue({ email: 'tenant@example.com' });
  });

  afterAll(() => {
    process.env.SESSION_SECRET = originalSessionSecret;
  });

  it('uses the requested notification email when session email is missing', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          notificationEmail: 'ana@example.com',
          channel: 'dashboard',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.notificationEmail).toBe('ana@example.com');
    expect(mockTenantProfileFindFirst).not.toHaveBeenCalled();
    expect(mockSendHoldedConnectedCommunication).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      companyName: 'Acme SL',
      supportedModules: ['invoicing', 'accounting'],
    });
  });

  it('rejects an invalid requested notification email before probing Holded', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          notificationEmail: 'not-an-email',
          channel: 'dashboard',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: 'El correo de aviso no parece valido. Revísalo y vuelve a intentarlo.',
    });
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
    expect(mockSendHoldedConnectedCommunication).not.toHaveBeenCalled();
  });

  it('reuses a signed validation token instead of probing Holded again', async () => {
    const validationToken = await mintHoldedValidationToken({
      tenantId: 'tenant_1',
      channel: 'dashboard',
      apiKey: 'abcdefghijklmnop',
      probe: {
        ok: true,
        invoiceApi: { ok: true, status: 200 },
        accountingApi: { ok: true, status: 200 },
        crmApi: { ok: false, status: 403 },
        projectsApi: { ok: false, status: 403 },
        teamApi: { ok: false, status: 403 },
        error: null,
      },
    });

    const response = await POST(
      new Request('https://holded.verifactu.business/api/holded/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'abcdefghijklmnop',
          notificationEmail: 'ana@example.com',
          channel: 'dashboard',
          validationToken,
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockProbeHoldedConnection).not.toHaveBeenCalled();
    expect(mockSaveHoldedConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        probe: expect.objectContaining({ ok: true }),
      })
    );
  });
});
