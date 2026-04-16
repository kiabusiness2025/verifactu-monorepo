describe('holded navigation return target sanitization', () => {
  const previousAppSiteUrl = process.env.NEXT_PUBLIC_APP_SITE_URL;
  const previousHoldedSiteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_APP_SITE_URL = 'https://app.verifactu.business';
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL = 'https://holded.verifactu.business';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_SITE_URL = previousAppSiteUrl;
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL = previousHoldedSiteUrl;
  });

  it('keeps the app oauth authorize return target used by ChatGPT login handoff', async () => {
    const { sanitizeHoldedReturnTarget } = await import('./holded-navigation');

    expect(
      sanitizeHoldedReturnTarget(
        'https://app.verifactu.business/oauth/authorize?client_id=openai-chatgpt-test',
        'https://holded.verifactu.business/dashboard?source=fallback'
      )
    ).toBe('https://app.verifactu.business/oauth/authorize?client_id=openai-chatgpt-test');
  });

  it('canonicalizes stale app onboarding holded links to holded domain', async () => {
    const { sanitizeHoldedReturnTarget } = await import('./holded-navigation');

    expect(
      sanitizeHoldedReturnTarget(
        'https://app.verifactu.business/onboarding/holded?channel=chatgpt&login_handoff=1&tenant_id=tenant-demo',
        'https://holded.verifactu.business/dashboard?source=fallback'
      )
    ).toBe(
      'https://holded.verifactu.business/onboarding/holded?channel=chatgpt&login_handoff=1&tenant_id=tenant-demo'
    );
  });

  it('keeps relative holded paths for local handoff routes', async () => {
    const { sanitizeHoldedReturnTarget } = await import('./holded-navigation');

    expect(
      sanitizeHoldedReturnTarget(
        '/dashboard?source=holded_oauth&next=https%3A%2F%2Fapp.verifactu.business%2Foauth%2Fauthorize',
        'https://holded.verifactu.business/dashboard?source=fallback'
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
        'https://holded.verifactu.business/dashboard?source=fallback'
      )
    ).toBe('https://holded.verifactu.business/dashboard?source=fallback');
  });

  it('preserves chatgpt handoff params across connector intro and connect pages', async () => {
    const { buildConnectorIntroUrl, buildConnectorConnectUrl } =
      await import('./holded-navigation');

    expect(
      buildConnectorIntroUrl({
        source: 'holded_chatgpt_entry',
        channel: 'chatgpt',
        next: 'https://app.verifactu.business/oauth/authorize?client_id=openai-mobile',
        onboardingToken: 'token-123',
      })
    ).toBe(
      '/onboarding?source=holded_chatgpt_entry&channel=chatgpt&next=https%3A%2F%2Fapp.verifactu.business%2Foauth%2Fauthorize%3Fclient_id%3Dopenai-mobile&onboarding_token=token-123'
    );

    expect(
      buildConnectorConnectUrl({
        source: 'holded_chatgpt_entry',
        channel: 'chatgpt',
        next: 'https://app.verifactu.business/oauth/authorize?client_id=openai-mobile',
        onboardingToken: 'token-123',
      })
    ).toBe(
      '/onboarding/holded?source=holded_chatgpt_entry&channel=chatgpt&next=https%3A%2F%2Fapp.verifactu.business%2Foauth%2Fauthorize%3Fclient_id%3Dopenai-mobile&onboarding_token=token-123'
    );
  });
});
