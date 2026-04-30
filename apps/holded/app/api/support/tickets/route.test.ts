/** @jest-environment node */

jest.mock('@/app/lib/holded-session', () => ({
  __esModule: true,
  getHoldedSession: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedNotificationEmail: jest.fn(),
}));

import { sendHoldedNotificationEmail } from '@/app/lib/communications/holded-email-service';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

const mockSession = getHoldedSession as jest.Mock;
const mockTx = prisma.$transaction as jest.Mock;
const mockSendEmail = sendHoldedNotificationEmail as jest.Mock;

describe('POST /api/support/tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSession.mockResolvedValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'ana@example.com',
      name: 'Ana',
    });

    mockTx.mockImplementation(async (callback: (tx: any) => Promise<any>) =>
      callback({
        supportTicket: {
          create: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
        },
        supportMessage: {
          create: jest.fn().mockResolvedValue({ id: 'message-1' }),
        },
      })
    );

    mockSendEmail.mockResolvedValue({ success: true, messageId: 'mail-1', error: null });
  });

  it('creates ticket and sends claude-branded notifications', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
        body: JSON.stringify({
          connector: 'claude',
          subject: 'Error de conexion',
          message: 'No puedo finalizar la conexion desde Claude.',
          source: 'claude_connector_support_form',
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.ticketId).toBe('ticket-1');
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('[Holded Claude]'),
      })
    );
  });

  it('returns 401 for unauthenticated user', async () => {
    mockSession.mockResolvedValueOnce(null);

    const response = await POST(
      new Request('https://holded.verifactu.business/api/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          connector: 'chatgpt',
          message: 'Mensaje válido de soporte con longitud suficiente.',
        }),
      }) as never
    );

    expect(response.status).toBe(401);
  });
});
