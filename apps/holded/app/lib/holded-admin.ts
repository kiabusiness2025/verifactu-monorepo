import { redirect } from 'next/navigation';
import { getHoldedSession } from './holded-session';

function readAdminEmails() {
  const raw =
    process.env.HOLDED_ADMIN_EMAILS?.trim() ||
    process.env.ADMIN_EMAILS?.trim() ||
    'soporte@verifactu.business';
  return raw
    .split(/[,\n;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isHoldedAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return readAdminEmails().includes(email.trim().toLowerCase());
}

export async function requireHoldedAdminSession() {
  const session = await getHoldedSession();

  if (!session?.email || !isHoldedAdminEmail(session.email)) {
    redirect('/dashboard');
  }

  return session;
}
