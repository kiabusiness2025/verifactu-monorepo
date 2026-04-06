describe('holded navigation return target sanitization', () => {
  const previousAppSiteUrl = process.env.NEXT_PUBLIC_APP_SITE_URL;
  const previousHoldedSiteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL;
  const previousIsaakSiteUrl = process.env.NEXT_PUBLIC_ISAAK_SITE_URL;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_APP_SITE_URL = 'https://app.verifactu.business';
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL = 'https://holded.verifactu.business';
    process.env.NEXT_PUBLIC_ISAAK_SITE_URL = 'https://isaak.verifactu.business';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_SITE_URL = previousAppSiteUrl;
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL = previousHoldedSiteUrl;
    process.env.NEXT_PUBLIC_ISAAK_SITE_URL = previousIsaakSiteUrl;
  });

  it('keeps the app oauth authorize return target used by ChatGPT login handoff', async () => {
    const { sanitizeHoldedReturnTarget } = await import('./holded-navigation');

    expect(
      sanitizeHoldedReturnTarget(
        'https://app.verifactu.business/oauth/authorize?client_id=openai-chatgpt-test',
        'https://isaak.verifactu.business/chat?source=fallback'
      )
    ).toBe('https://app.verifactu.business/oauth/authorize?client_id=openai-chatgpt-test');
  });

  it('keeps relative holded paths for local handoff routes', async () => {
    const { sanitizeHoldedReturnTarget } = await import('./holded-navigation');

    expect(
      sanitizeHoldedReturnTarget(
        '/dashboard?source=holded_oauth&next=https%3A%2F%2Fapp.verifactu.business%2Foauth%2Fauthorize',
        'https://isaak.verifactu.business/chat?source=fallback'
      )
    ).toBe(
      'https://holded.verifactu.business/dashboard?source=holded_oauth&next=https%3A%2F%2Fapp.verifactu.business%2Foauth%2Fauthorize'
    );
  });

  it('rejects external origins outside the approved product surfaces', async () => {
    const { sanitizeHoldedReturnTarget } = await import('./holded-navigation');

    expect(
      sanitizeHoldedReturnTarget(
        'https://evil.example.com/phishing',
        'https://isaak.verifactu.business/chat?source=fallback'
      )
    ).toBe('https://isaak.verifactu.business/chat?source=fallback');
  });
});
