/** @jest-environment node */

jest.mock('@/app/lib/communications/holded-email-service', () => ({
  __esModule: true,
  sendHoldedContactNotification: jest.fn(),
}));

import { sendHoldedContactNotification } from '@/app/lib/communications/holded-email-service';
import { POST } from './route';

const mockSend = sendHoldedContactNotification as jest.Mock;

describe('POST /api/communications/contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ success: true, messageId: 'contact-1', error: null });
  });

  it('validates consent and sends contact notification', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/communications/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.1.1.1',
        },
        body: JSON.stringify({
          name: 'Ana',
          email: 'ana@example.com',
          subject: 'Informacion',
          message: 'Necesito ayuda para conectar Holded.',
          consent: true,
        }),
      }) as never
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ana',
        email: 'ana@example.com',
      })
    );
  });

  it('rejects request without consent', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/communications/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Ana',
          email: 'ana@example.com',
          message: 'Hola',
          consent: false,
        }),
      }) as never
    );

    expect(response.status).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
