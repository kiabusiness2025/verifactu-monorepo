/** @jest-environment node */

jest.mock('@/lib/firebase-admin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'google-onboarding-token'),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { verifyIdToken } from '@/lib/firebase-admin';
import { resolveHoldedOnboardingSessionFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';

describe('POST /api/onboarding/identity/google', () => {
  beforeEach(() => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: null,
      name: 'Connector Guest',
      tenantId: 'tenant-123',
    });
    (verifyIdToken as jest.Mock).mockResolvedValue({
      uid: 'google-user-1',
      email: 'demo@example.com',
      email_verified: true,
      name: 'Demo User',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('verifies the Google token and refreshes the onboarding token with verified identity data', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/onboarding/identity/google',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({ idToken: 'google-id-token' }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.onboardingToken).toBe('google-onboarding-token');
    expect(payload.identity).toEqual(
      expect.objectContaining({
        authMethod: 'google',
        email: 'demo@example.com',
        emailVerified: true,
      })
    );
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'google-user-1',
        email: 'demo@example.com',
        tenantId: 'tenant-123',
        authMethod: 'google',
        emailVerified: true,
      })
    );
  });
});
