/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('@/lib/email/emailService', () => ({
  sendCustomEmail: jest.fn(async () => ({ success: true })),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    membership: {
      findMany: jest.fn(),
    },
    tenantProfile: {
      findUnique: jest.fn(),
    },
  },
}));

import { sendCustomEmail } from '@/lib/email/emailService';
import { sendHoldedSecurityAlertEmails } from './holdedSecurityAlerts';

describe('holdedSecurityAlerts', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses soporte@verifactu.business and renders Holded + ChatGPT branding', async () => {
    await sendHoldedSecurityAlertEmails({
      recipients: [{ email: 'demo@example.com', name: 'Demo User', source: 'membership' }],
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      actorEmail: 'owner@example.com',
      actorName: 'Owner User',
      action: 'connected',
      channel: 'chatgpt',
      occurredAt: new Date('2026-04-09T18:00:00.000Z'),
    });

    expect(sendCustomEmail).toHaveBeenCalledTimes(1);
    expect(sendCustomEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'demo@example.com',
        senderProfile: 'holded',
        html: expect.stringContaining('soporte@verifactu.business'),
      })
    );

    const sentHtml = (sendCustomEmail as jest.Mock).mock.calls[0][0].html as string;
    expect(sentHtml).toContain('/brand/holded/holded-diamond-logo.png');
    expect(sentHtml).toContain('/brand/chatgpt/chatgpt-logo.png');
    expect(sentHtml).toContain('Holded + ChatGPT');
    expect(sentHtml).not.toContain('support@verifactu.business');
  });
});
