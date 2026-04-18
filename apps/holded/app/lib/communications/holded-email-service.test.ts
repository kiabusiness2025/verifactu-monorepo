const mockSend = jest.fn();

jest.mock('resend', () => ({
  __esModule: true,
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import { sendHoldedConnectedCommunication } from './holded-email-service';

describe('sendHoldedConnectedCommunication', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM = 'Holded <no-reply@holded.verifactu.business>';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses ADMIN_EMAILS fallback when specific holded admin env vars are missing', async () => {
    delete process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS;
    delete process.env.HOLDED_ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = 'admin1@example.com, admin2@example.com';

    mockSend.mockResolvedValue({ data: { id: 'message-id' }, error: null });

    await sendHoldedConnectedCommunication({
      name: 'Ana',
      userEmail: 'user@example.com',
      companyName: 'Acme SL',
      supportedModules: ['invoicing'],
      channel: 'chatgpt',
      returnUrl: 'https://chatgpt.com/connector/oauth/demo',
    });

    const adminCall = mockSend.mock.calls.find(
      ([payload]) => Array.isArray(payload?.to) && payload.to.includes('admin1@example.com')
    );

    expect(adminCall).toBeDefined();
    expect(adminCall?.[0]?.to).toEqual(['admin1@example.com', 'admin2@example.com']);
  });

  it('deduplicates admin recipients merged from all env sources', async () => {
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS = 'alerts@example.com; soporte@verifactu.business';
    process.env.HOLDED_ADMIN_EMAILS = 'alerts@example.com';
    process.env.ADMIN_EMAILS = 'soporte@verifactu.business,ops@example.com';

    mockSend.mockResolvedValue({ data: { id: 'message-id' }, error: null });

    await sendHoldedConnectedCommunication({
      name: 'Ana',
      userEmail: 'user@example.com',
      companyName: 'Acme SL',
      supportedModules: ['invoicing'],
      channel: 'dashboard',
    });

    const adminCall = mockSend.mock.calls.find(
      ([payload]) => Array.isArray(payload?.to) && payload.to.includes('alerts@example.com')
    );

    expect(adminCall).toBeDefined();
    expect(adminCall?.[0]?.to).toEqual([
      'alerts@example.com',
      'soporte@verifactu.business',
      'ops@example.com',
    ]);
  });
});
