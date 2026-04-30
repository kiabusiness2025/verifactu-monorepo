/** @jest-environment node */

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    externalConnection: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedWeeklySummaryAdminEmail: jest.fn(),
}));

import { sendHoldedWeeklySummaryAdminEmail } from '@/app/lib/communications/holded-email-service';
import { prisma } from '@/app/lib/prisma';
import { GET } from './route';

const mockFindMany = prisma.externalConnection.findMany as jest.Mock;
const mockSendWeekly = sendHoldedWeeklySummaryAdminEmail as jest.Mock;

describe('GET /api/admin/weekly-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'secret-1';

    mockFindMany
      .mockResolvedValueOnce([
        { tenantId: 't1', channelKey: 'chatgpt' },
        { tenantId: 't1', channelKey: 'chatgpt' },
        { tenantId: 't2', channelKey: 'claude' },
        { tenantId: 't3', channelKey: 'dashboard' },
      ])
      .mockResolvedValueOnce([{ tenantId: 't4' }, { tenantId: 't4' }, { tenantId: 't5' }])
      .mockResolvedValueOnce([{ tenantId: 't1' }, { tenantId: 't2' }, { tenantId: 't3' }]);

    mockSendWeekly.mockResolvedValue({
      success: true,
      messageId: 'weekly-id-1',
      error: null,
      recipients: ['ops@example.com'],
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('aggregates unique tenants and includes claude channel in report', async () => {
    const response = await GET(
      new Request('https://holded.verifactu.business/api/admin/weekly-summary', {
        headers: { authorization: 'Bearer secret-1' },
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.newConnections).toBe(3);
    expect(payload.disconnections).toBe(2);
    expect(payload.totalActive).toBe(3);
    expect(payload.newConnectionsByChannel).toEqual({
      chatgpt: 1,
      claude: 1,
      dashboard: 1,
    });

    expect(mockSendWeekly).toHaveBeenCalledWith(
      expect.objectContaining({
        newConnections: 3,
        disconnections: 2,
        totalActive: 3,
        newConnectionsByChannel: {
          chatgpt: 1,
          claude: 1,
          dashboard: 1,
        },
      })
    );
  });

  it('returns 401 when cron secret does not match', async () => {
    const response = await GET(
      new Request('https://holded.verifactu.business/api/admin/weekly-summary', {
        headers: { authorization: 'Bearer wrong' },
      })
    );

    expect(response.status).toBe(401);
  });
});
