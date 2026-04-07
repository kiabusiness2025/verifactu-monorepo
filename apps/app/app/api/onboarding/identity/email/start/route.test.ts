/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('@/lib/email/emailService', () => ({
  sendCustomEmail: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedEmailVerificationToken: jest.fn(async () => 'email-verification-token'),
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'email-onboarding-token'),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { sendCustomEmail } from '@/lib/email/emailService';
import { resolveHoldedOnboardingSessionFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import {
  mintHoldedEmailVerificationToken,
  mintHoldedOnboardingTokenForSubject,
} from '@/lib/oauth/mcp';

describe('POST /api/onboarding/identity/email/start', () => {
  beforeEach(() => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: null,
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: null,
    });
    (sendCustomEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends a signed verification email and refreshes the onboarding token for the manual email path', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/onboarding/identity/email/start',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({
          email: 'verified@example.com',
          returnUrl: 'https://app.verifactu.business/onboarding/holded?channel=chatgpt',
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.onboardingToken).toBe('email-onboarding-token');
    expect(payload.identity).toEqual({
      authMethod: 'email',
      email: 'verified@example.com',
      emailVerified: false,
    });
    expect(mintHoldedEmailVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        email: 'verified@example.com',
      })
    );
    expect(sendCustomEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'verified@example.com',
        subject: 'Confirma tu correo para conectar Holded',
        html: expect.stringContaining('email-verification-token'),
      })
    );
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        email: 'verified@example.com',
        authMethod: 'email',
        emailVerified: false,
      })
    );
  });
});
