/** @jest-environment node */

jest.mock('firebase-admin', () => {
  const adminMock = {
    apps: [] as Array<{ name: string; auth: () => unknown }>,
    credential: {
      cert: jest.fn(() => ({ kind: 'firebase-cert' })),
    },
    initializeApp: jest.fn((_: unknown, name: string) => {
      const app = {
        name,
        auth: () => ({
          verifyIdToken: jest.fn(),
          generateEmailVerificationLink: jest.fn(),
        }),
      };

      adminMock.apps.push(app);
      return app;
    }),
  };

  return {
    __esModule: true,
    default: adminMock,
  };
});

jest.mock('resend', () => ({
  __esModule: true,
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

jest.mock('@/app/lib/communications/holded-email-templates', () => ({
  __esModule: true,
  buildHoldedVerificationEmail: jest.fn(() => ({
    subject: 'verify-subject',
    html: '<p>verify</p>',
    text: 'verify',
  })),
  buildHoldedWelcomeEmail: jest.fn(() => ({
    subject: 'welcome-subject',
    html: '<p>welcome</p>',
    text: 'welcome',
  })),
}));

jest.mock('@/app/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    user: {
      upsert: jest.fn(),
      count: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
    tenantProfile: {
      upsert: jest.fn(),
    },
    externalConnection: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import admin from 'firebase-admin';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/prisma';
import { POST } from './route';

const mockVerifyIdToken = jest.fn();
const mockGenerateEmailVerificationLink = jest.fn();
const mockResendSend = jest.fn();
const mockUserUpsert = prisma.user.upsert as jest.Mock;
const mockUserCount = prisma.user.count as jest.Mock;
const mockMembershipFindFirst = prisma.membership.findFirst as jest.Mock;
const mockTenantProfileUpsert = prisma.tenantProfile.upsert as jest.Mock;
const mockExternalConnectionCount = prisma.externalConnection.count as jest.Mock;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (admin.apps as Array<unknown>).length = 0;

    (admin.initializeApp as jest.Mock).mockImplementation((_: unknown, name: string) => {
      const app = {
        name,
        auth: () => ({
          verifyIdToken: mockVerifyIdToken,
          generateEmailVerificationLink: mockGenerateEmailVerificationLink,
        }),
      };

      (admin.apps as Array<unknown>).push(app);
      return app;
    });
    (Resend as unknown as jest.Mock).mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    }));

    process.env.FIREBASE_ADMIN_PROJECT_ID = 'demo-project';
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'firebase-admin@example.com';
    process.env.FIREBASE_ADMIN_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----';
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL = 'https://holded.verifactu.business';
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.RESEND_FROM = 'Holded for Isaak <holded@verifactu.business>';
    process.env.RESEND_REPLY_TO = 'soporte@verifactu.business';
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS = 'admin@example.com';

    mockVerifyIdToken.mockResolvedValue({
      uid: 'firebase-user-1',
      email: 'ana@example.com',
      name: 'Ana Firebase',
    });
    mockGenerateEmailVerificationLink.mockResolvedValue('https://holded.verifactu.business/verify');
    mockUserUpsert.mockResolvedValue({ id: 'user_1' });
    mockMembershipFindFirst.mockResolvedValue({ tenantId: 'tenant_1' });
    mockTenantProfileUpsert.mockResolvedValue({ id: 'profile_1' });
    mockUserCount.mockResolvedValue(7);
    mockExternalConnectionCount.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    mockResendSend
      .mockResolvedValueOnce({ data: { id: 'verification-email-id' } })
      .mockResolvedValueOnce({ data: { id: 'welcome-email-id' } })
      .mockResolvedValueOnce({ data: { id: 'admin-email-id' } });
  });

  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    delete process.env.NEXT_PUBLIC_HOLDED_SITE_URL;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    delete process.env.RESEND_REPLY_TO;
    delete process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS;
  });

  it('sends verification, welcome, and admin emails when registration succeeds', async () => {
    const response = await POST(
      new Request('https://holded.verifactu.business/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idToken: 'firebase-id-token',
          source: 'holded_signup',
          fullName: 'Ana Prueba',
          phone: '+34 600 000 000',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      verificationEmailId: 'verification-email-id',
      verificationEmailSent: true,
      welcomeEmailId: 'welcome-email-id',
    });
    expect(mockResendSend).toHaveBeenCalledTimes(3);
    expect(mockResendSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: ['ana@example.com'],
        subject: 'verify-subject',
      })
    );
    expect(mockResendSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: ['ana@example.com'],
        subject: 'welcome-subject',
      })
    );
    expect(mockResendSend).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        to: expect.arrayContaining(['admin@example.com', 'soporte@verifactu.business']),
      })
    );
  });
});
