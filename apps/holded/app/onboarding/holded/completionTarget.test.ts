describe('resolveHoldedCompletionTarget', () => {
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

  it('falls back to success when next points back to the intro page', async () => {
    const { resolveHoldedCompletionTarget } = await import('./completionTarget');

    expect(resolveHoldedCompletionTarget('/onboarding')).toBe(
      'https://holded.verifactu.business/onboarding/success'
    );
  });

  it('falls back to success when next points back to the connection step', async () => {
    const { resolveHoldedCompletionTarget } = await import('./completionTarget');

    expect(resolveHoldedCompletionTarget('/onboarding/holded?source=holded_onboarding_retry')).toBe(
      'https://holded.verifactu.business/onboarding/success'
    );
  });

  it('canonicalizes external app oauth callbacks back to the public holded oauth endpoint', async () => {
    const { resolveHoldedCompletionTarget } = await import('./completionTarget');

    expect(
      resolveHoldedCompletionTarget(
        'https://app.verifactu.business/oauth/authorize?client_id=openai-chatgpt-test'
      )
    ).toBe('https://holded.verifactu.business/oauth/authorize?client_id=openai-chatgpt-test');
  });
});
