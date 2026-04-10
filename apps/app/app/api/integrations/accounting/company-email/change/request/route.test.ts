/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/integrations/companyNotificationEmailStore', () => ({
  getConfirmedCompanyNotificationEmail: jest.fn(async () => null),
  createCompanyNotificationEmailChangeRequest: jest.fn(async () => ({
    id: 'req-1',
    token: 'token-1',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    tenantId: 'tenant-1',
    requestedEmail: 'nuevo@empresa.com',
    currentConfirmedEmail: 'actual@empresa.com',
  })),
}));

jest.mock('@/lib/email/emailService', () => ({
  sendCustomEmail: jest.fn(async () => ({ success: true })),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import {
  createCompanyNotificationEmailChangeRequest,
  getConfirmedCompanyNotificationEmail,
} from '@/lib/integrations/companyNotificationEmailStore';
import { sendCustomEmail } from '@/lib/email/emailService';

describe('POST /api/integrations/accounting/company-email/change/request', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'user-1' },
    });
    (
      (prisma as unknown as { tenant: { findUnique: jest.Mock } }).tenant.findUnique as jest.Mock
    ).mockResolvedValue({
      profile: { email: 'actual@empresa.com' },
    });
    (getConfirmedCompanyNotificationEmail as jest.Mock).mockResolvedValue('actual@empresa.com');
    (sendCustomEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending change and sends confirmation email to current confirmed company email', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/company-email/change/request',
      {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'nuevo@empresa.com' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(createCompanyNotificationEmailChangeRequest).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      requestedEmail: 'nuevo@empresa.com',
      currentConfirmedEmail: 'actual@empresa.com',
      requestedByUid: 'user-1',
      ttlMinutes: 45,
    });
    expect(sendCustomEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'actual@empresa.com',
        subject: 'Confirma el cambio del correo de avisos de empresa',
      })
    );
  });

  it('rejects request when new email equals current confirmed email', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/company-email/change/request',
      {
        method: 'POST',
        body: JSON.stringify({ newEmail: 'actual@empresa.com' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(createCompanyNotificationEmailChangeRequest).not.toHaveBeenCalled();
  });
});
