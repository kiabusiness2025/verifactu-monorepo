/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('@/lib/email/emailService', () => ({
  sendCustomEmail: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  isVerifiedHoldedOnboardingIdentity: jest.fn(
    (session: { email?: string | null; emailVerified?: boolean }) =>
      Boolean(session?.email && session?.emailVerified)
  ),
  resolveHoldedOnboardingSession: jest.fn(),
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedEmailVerificationLinks', () => ({
  createHoldedEmailVerificationCode: jest.fn(async () => 'holded-verify-code'),
}));

jest.mock('@/lib/integrations/holdedVerifiedEmailIdentities', () => ({
  readVerifiedHoldedEmailIdentity: jest.fn(async () => null),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedEmailVerificationToken: jest.fn(async () => 'email-verification-token'),
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'email-onboarding-token'),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { sendCustomEmail } from '@/lib/email/emailService';
import {
  resolveHoldedOnboardingSession,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { createHoldedEmailVerificationCode } from '@/lib/integrations/holdedEmailVerificationLinks';
import { readVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
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
      authMethod: 'unknown',
      emailVerified: false,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: null,
    });
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);
    (sendCustomEmail as jest.Mock).mockResolvedValue({ success: true });
    (readVerifiedHoldedEmailIdentity as jest.Mock).mockResolvedValue(null);
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
    expect(payload.identity).toEqual(
      expect.objectContaining({
        authMethod: 'email',
        email: 'verified@example.com',
        emailVerified: false,
        firstName: 'Connector',
        lastName: 'Guest',
      })
    );
    expect(mintHoldedEmailVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        email: 'verified@example.com',
      })
    );
    expect(createHoldedEmailVerificationCode).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'email-verification-token' })
    );

    const sentEmail = (sendCustomEmail as jest.Mock).mock.calls[0][0];
    expect(sentEmail.to).toBe('verified@example.com');
    expect(sentEmail.subject).toBe('Confirma tu correo para conectar Holded');
    expect(sentEmail.senderProfile).toBe('holded');
    expect(sentEmail.html).toContain('code=holded-verify-code');
    expect(sentEmail.html).toContain('https://app.verifactu.business/onboarding/holded/verify');
    expect(sentEmail.html).not.toContain('email-verification-token');
    expect(sendCustomEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('holded-diamond-logo.png'),
      })
    );
    expect(sendCustomEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Powered by'),
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

  it('returns a verified onboarding identity without sending another email when the same email is already confirmed', async () => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'verified@example.com',
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: '2026-04-07T18:15:00.000Z',
    });

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
    expect(payload.alreadyVerified).toBe(true);
    expect(payload.identity).toEqual(
      expect.objectContaining({
        authMethod: 'email',
        email: 'verified@example.com',
        emailVerified: true,
        verifiedAt: '2026-04-07T18:15:00.000Z',
      })
    );
    expect(sendCustomEmail).not.toHaveBeenCalled();
    expect(createHoldedEmailVerificationCode).not.toHaveBeenCalled();
    expect(mintHoldedEmailVerificationToken).not.toHaveBeenCalled();
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'verified@example.com',
        emailVerified: true,
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
      'https://app.verifactu.business/api/onboarding/identity/email/start',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'verified@example.com',
          returnUrl: 'https://app.verifactu.business/onboarding/holded?channel=chatgpt',
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

  it('reuses a previously remembered verified email without resending another message', async () => {
    (readVerifiedHoldedEmailIdentity as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'verified@example.com',
      authMethod: 'email',
      verifiedAt: '2026-04-09T09:15:00.000Z',
      firstName: 'Ksenia',
      lastName: 'Ivanova Lopez',
      fullName: 'Ksenia Ivanova Lopez',
      tenantId: 'tenant-123',
      prefill: null,
    });

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
    expect(payload.alreadyVerified).toBe(true);
    expect(payload.emailSent).toBe(false);
    expect(payload.identity).toEqual(
      expect.objectContaining({
        authMethod: 'email',
        email: 'verified@example.com',
        emailVerified: true,
        firstName: 'Ksenia',
        lastName: 'Ivanova Lopez',
        verifiedAt: '2026-04-09T09:15:00.000Z',
      })
    );
    expect(sendCustomEmail).not.toHaveBeenCalled();
    expect(createHoldedEmailVerificationCode).not.toHaveBeenCalled();
    expect(mintHoldedEmailVerificationToken).not.toHaveBeenCalled();
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ksenia Ivanova Lopez',
        firstName: 'Ksenia',
        lastName: 'Ivanova Lopez',
      })
    );
  });

  it('checks the current verification status without resending when checkOnly is true', async () => {
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
          checkOnly: true,
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        alreadyVerified: false,
        emailSent: false,
        identity: expect.objectContaining({
          authMethod: 'email',
          email: 'verified@example.com',
          emailVerified: false,
        }),
      })
    );
    expect(sendCustomEmail).not.toHaveBeenCalled();
    expect(createHoldedEmailVerificationCode).not.toHaveBeenCalled();
    expect(mintHoldedEmailVerificationToken).not.toHaveBeenCalled();
  });

  it('rejects the request when the temporary onboarding token is missing', async () => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'https://app.verifactu.business/api/onboarding/identity/email/start',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'verified@example.com',
          returnUrl: 'https://app.verifactu.business/onboarding/holded?channel=chatgpt',
        }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ ok: false, error: 'onboarding session required' });
    expect(sendCustomEmail).not.toHaveBeenCalled();
    expect(mintHoldedEmailVerificationToken).not.toHaveBeenCalled();
  });
});
