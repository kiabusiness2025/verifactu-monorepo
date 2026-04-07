/** @jest-environment node */

describe('emailService', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'email-123' }),
    });
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'resend-test-key',
      RESEND_API_KEY_HOLDED: 'resend-holded-key',
      RESEND_FROM: 'Verifactu Business <no-reply@verifactu.business>',
      RESEND_FROM_HOLDED: 'Holded <no-reply@holded.verifactu.business>',
      RESEND_FROM_NOREPLY: '',
      RESEND_FROM_SUPPORT: '',
      RESEND_FROM_INFO: '',
    };
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses RESEND_FROM as the fallback sender for custom emails', async () => {
    const { sendCustomEmail } = await import('./emailService');

    await sendCustomEmail({
      to: 'verified@example.com',
      subject: 'Test email',
      html: '<p>Hola</p>',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(requestInit.body));

    expect(payload.from).toBe('Verifactu Business <no-reply@verifactu.business>');
    expect(payload.to).toBe('verified@example.com');
    expect(payload.subject).toBe('Test email');
  });

  it('uses the Holded-specific sender profile when requested', async () => {
    const { sendCustomEmail } = await import('./emailService');

    await sendCustomEmail({
      to: 'verified@example.com',
      subject: 'Holded test email',
      html: '<p>Hola Holded</p>',
      senderProfile: 'holded',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    const payload = JSON.parse(String(requestInit.body));

    expect(requestInit.headers.Authorization).toBe('Bearer resend-holded-key');
    expect(payload.from).toBe('Holded <no-reply@holded.verifactu.business>');
    expect(payload.to).toBe('verified@example.com');
    expect(payload.subject).toBe('Holded test email');
  });
});
