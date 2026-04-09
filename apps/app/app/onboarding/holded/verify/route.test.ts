/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'verified-onboarding-token'),
  verifyHoldedEmailVerificationToken: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedEmailVerificationLinks', () => ({
  resolveHoldedEmailVerificationTokenFromCode: jest.fn(async () => null),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { resolveHoldedEmailVerificationTokenFromCode } from '@/lib/integrations/holdedEmailVerificationLinks';
import {
  mintHoldedOnboardingTokenForSubject,
  verifyHoldedEmailVerificationToken,
} from '@/lib/oauth/mcp';

describe('GET /onboarding/holded/verify', () => {
  beforeEach(() => {
    (verifyHoldedEmailVerificationToken as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'verified@example.com',
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      firstName: 'Connector',
      lastName: 'Guest',
      returnUrl: 'https://app.verifactu.business/onboarding/holded?channel=chatgpt',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects back to onboarding with a verified onboarding token', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/onboarding/holded/verify?token=email-verification-token'
    );

    const response = await GET(request);
    const location = response.headers.get('location') || '';

    expect(response.status).toBe(307);
    expect(location).toContain('/onboarding/holded');
    expect(location).toContain('onboarding_token=verified-onboarding-token');
    expect(location).toContain('identity_verified=1');
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        email: 'verified@example.com',
        authMethod: 'email',
        emailVerified: true,
      })
    );
  });

  it('accepts short verification codes and resolves the backing token before redirecting', async () => {
    (resolveHoldedEmailVerificationTokenFromCode as jest.Mock).mockResolvedValue(
      'email-verification-token'
    );

    const request = new NextRequest(
      'https://app.verifactu.business/onboarding/holded/verify?code=holded-verify-code'
    );

    const response = await GET(request);
    const location = response.headers.get('location') || '';

    expect(response.status).toBe(307);
    expect(location).toContain('identity_verified=1');
    expect(resolveHoldedEmailVerificationTokenFromCode).toHaveBeenCalledWith('holded-verify-code');
    expect(verifyHoldedEmailVerificationToken).toHaveBeenCalledWith('email-verification-token');
  });
});
