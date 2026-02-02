import { getAdminSessionOrNull } from '@/lib/auth';

export async function requireAdmin(_req: Request): Promise<{ email: string; userId: string }> {
  const allowLocalBypass =
    process.env.ADMIN_LOCAL_BYPASS === '1' && process.env.NODE_ENV !== 'production';
  const isDev = process.env.NODE_ENV !== 'production';
  const allowRelaxed = process.env.ADMIN_RELAXED_AUTH === '1';
  if (allowLocalBypass) {
    return { email: 'local-bypass@verifactu.business', userId: 'local-bypass' };
  }

  const session = await getAdminSessionOrNull();
  const email = session?.user?.email?.toLowerCase() || '';
  const userId = session?.user?.id || '';

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedEmail = (
    process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business'
  ).toLowerCase();
  const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business').toLowerCase();

  // Allow any authenticated user in dev if no admin list is configured.
  if (isDev && adminEmails.length === 0 && email) {
    return { email, userId };
  }

  const emailOk =
    (!!email && adminEmails.includes(email)) ||
    email === allowedEmail ||
    (allowedDomain && email.endsWith(`@${allowedDomain}`));

  if (!email || (!emailOk && !allowRelaxed)) {
    throw new Error('FORBIDDEN: Admin access required');
  }

  return { email, userId };
}

export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin({} as Request);
    return true;
  } catch {
    return false;
  }
}
