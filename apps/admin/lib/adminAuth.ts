import { getAdminSessionOrNull } from '@/lib/auth';

export async function requireAdmin(_req: Request): Promise<{ email: string; userId: string }> {
  const allowLocalBypass =
    process.env.ADMIN_LOCAL_BYPASS === '1' && process.env.NODE_ENV !== 'production';
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

  if (!email || adminEmails.length === 0 || !adminEmails.includes(email)) {
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
