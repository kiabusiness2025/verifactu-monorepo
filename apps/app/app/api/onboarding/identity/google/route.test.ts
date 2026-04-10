/** @jest-environment node */

jest.mock('@/lib/firebase-admin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  resolveHoldedOnboardingSession: jest.fn(),
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'google-onboarding-token'),
}));

jest.mock('@/lib/integrations/holdedVerifiedEmailIdentities', () => ({
  rememberVerifiedHoldedEmailIdentity: jest.fn(async () => null),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { verifyIdToken } from '@/lib/firebase-admin';
import {
  resolveHoldedOnboardingSession,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { rememberVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';

describe('POST /api/onboarding/identity/google', () => {
  beforeEach(() => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: null,
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      authMethod: 'unknown',
      emailVerified: false,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: null,
    });
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);
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
        firstName: 'Demo',
        lastName: 'User',
      })
    );
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'google-user-1',
        email: 'demo@example.com',
        name: 'Demo User',
        firstName: 'Demo',
        lastName: 'User',
        tenantId: 'tenant-123',
        authMethod: 'google',
        emailVerified: true,
      })
    );
    expect(rememberVerifiedHoldedEmailIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'google-user-1',
        email: 'demo@example.com',
        authMethod: 'google',
        firstName: 'Demo',
        lastName: 'User',
        fullName: 'Demo User',
      })
    );
  });

  it('uses Google given_name and family_name when the display name is missing', async () => {
    (verifyIdToken as jest.Mock).mockResolvedValue({
      uid: 'google-user-1',
      email: 'kiabusiness2025@gmail.com',
      email_verified: true,
      given_name: 'Ksenia',
      family_name: 'Ivanova Lopez',
    });

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
    expect(payload.identity).toEqual(
      expect.objectContaining({
        email: 'kiabusiness2025@gmail.com',
        firstName: 'Ksenia',
        lastName: 'Ivanova Lopez',
        name: 'Ksenia Ivanova Lopez',
      })
    );
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'kiabusiness2025@gmail.com',
        name: 'Ksenia Ivanova Lopez',
        firstName: 'Ksenia',
        lastName: 'Ivanova Lopez',
      })
    );
  });

  it('preserves the onboarding name instead of deriving one from the email alias when Google has no profile name', async () => {
    (verifyIdToken as jest.Mock).mockResolvedValue({
      uid: 'google-user-1',
      email: 'kiabusiness2025@gmail.com',
      email_verified: true,
    });

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
    expect(payload.identity).toEqual(
      expect.objectContaining({
        email: 'kiabusiness2025@gmail.com',
        firstName: 'Connector',
        lastName: 'Guest',
        name: 'Connector Guest',
      })
    );
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'kiabusiness2025@gmail.com',
        name: 'Connector Guest',
        firstName: 'Connector',
        lastName: 'Guest',
      })
    );
  });

  it('accepts the onboarding token from the request body when the custom header is unavailable', async () => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: null,
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      authMethod: 'unknown',
      emailVerified: false,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: null,
    });

    const request = new NextRequest(
      'https://app.verifactu.business/api/onboarding/identity/google',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: 'google-id-token',
          onboardingToken: 'onboarding-token-from-body',
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(resolveHoldedOnboardingSession).toHaveBeenCalledWith('onboarding-token-from-body');
  });

  it('rejects Google identities whose email is not verified by the provider', async () => {
    (verifyIdToken as jest.Mock).mockResolvedValue({
      uid: 'google-user-1',
      email: 'demo@example.com',
      email_verified: false,
      name: 'Demo User',
    });

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

    expect(response.status).toBe(403);
    expect(payload).toEqual({ ok: false, error: 'Google account email must be verified' });
    expect(mintHoldedOnboardingTokenForSubject).not.toHaveBeenCalled();
  });

  it('rejects the request when the temporary onboarding token is missing', async () => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'https://app.verifactu.business/api/onboarding/identity/google',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: 'google-id-token',
          tenantIdHint: 'tenant-456',
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ ok: false, error: 'onboarding session required' });
    expect(mintHoldedOnboardingTokenForSubject).not.toHaveBeenCalled();
  });
});
