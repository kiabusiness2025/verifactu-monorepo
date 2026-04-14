jest.mock('./session', () => ({
  getSessionPayload: jest.fn(),
}));

import { getSessionPayload } from './session';
import { isAdmin, requireAdmin } from './adminAuth';

describe('adminAuth', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = '';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it('allows the preconfigured soporte account without ADMIN_EMAILS', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'support-user',
      email: 'soporte@verifactu.business',
    });

    await expect(requireAdmin({} as Request)).resolves.toEqual({
      email: 'soporte@verifactu.business',
      userId: 'support-user',
    });
  });

  it('allows the preconfigured gmail support account without ADMIN_EMAILS', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'gmail-user',
      email: 'kiabuasiness2025@gmail.com',
    });

    await expect(requireAdmin({} as Request)).resolves.toEqual({
      email: 'kiabuasiness2025@gmail.com',
      userId: 'gmail-user',
    });
  });

  it('allows extra env admins while preserving the defaults', async () => {
    process.env.ADMIN_EMAILS = 'otro.admin@example.com';
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'custom-admin',
      email: 'otro.admin@example.com',
    });

    await expect(requireAdmin({} as Request)).resolves.toEqual({
      email: 'otro.admin@example.com',
      userId: 'custom-admin',
    });
  });

  it('rejects non-allowlisted emails', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'regular-user',
      email: 'cliente@example.com',
    });

    await expect(requireAdmin({} as Request)).rejects.toThrow('FORBIDDEN: Admin access required');
  });

  it('isAdmin returns false when the session email is not allowed', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'regular-user',
      email: 'cliente@example.com',
    });

    await expect(isAdmin()).resolves.toBe(false);
  });
});
