/** @jest-environment node */

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('@/lib/integrations/companyNotificationEmailStore', () => ({
  consumeCompanyNotificationEmailChangeRequest: jest.fn(async () => null),
  upsertConfirmedCompanyNotificationEmail: jest.fn(async () => ({
    tenantId: 'tenant-1',
    email: 'nuevo@empresa.com',
    verifiedAt: new Date('2030-01-01T00:00:00.000Z'),
  })),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import {
  consumeCompanyNotificationEmailChangeRequest,
  upsertConfirmedCompanyNotificationEmail,
} from '@/lib/integrations/companyNotificationEmailStore';

describe('GET /api/integrations/accounting/company-email/change/confirm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies confirmed company email when token is valid', async () => {
    (consumeCompanyNotificationEmailChangeRequest as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      requestedEmail: 'nuevo@empresa.com',
      currentConfirmedEmail: 'actual@empresa.com',
      requestedByUid: 'user-1',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/company-email/change/confirm?token=abc'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(upsertConfirmedCompanyNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', email: 'nuevo@empresa.com' })
    );
    expect(response.headers.get('location')).toContain('company_email_change=confirmed');
  });

  it('redirects as invalid when token is missing or expired', async () => {
    (consumeCompanyNotificationEmailChangeRequest as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/company-email/change/confirm?token=bad'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(upsertConfirmedCompanyNotificationEmail).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toContain('company_email_change=invalid');
  });
});
