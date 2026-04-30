/** @jest-environment node */

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    demoRequest: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedDemoRequestNotification: jest.fn(),
}));

import { sendHoldedDemoRequestNotification } from '@/app/lib/communications/holded-email-service';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

const mockCreate = prisma.demoRequest.create as jest.Mock;
const mockNotify = sendHoldedDemoRequestNotification as jest.Mock;

describe('POST /api/demo-requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'demo-1' });
    mockNotify.mockResolvedValue({ success: true, messageId: 'mail-1', error: null });
  });

  it('stores request and triggers async admin notification', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/demo-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '3.3.3.3' },
        body: JSON.stringify({
          name: 'Ana',
          email: 'ana@example.com',
          companyName: 'Acme',
          consent: true,
          usesHolded: true,
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, id: 'demo-1' });
    expect(mockCreate).toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'demo-1',
        companyName: 'Acme',
      })
    );
  });
});
