import { redirect } from 'next/navigation';
import {
  getPreconfiguredAdminEmails,
  getPrimaryConnectorAdminEmail,
  isPreconfiguredAdminEmail,
} from '@verifactu/utils/admin-access';

export function getHoldedConnectorAdminEmails() {
  return getPreconfiguredAdminEmails(process.env.ADMIN_EMAILS || '');
}

export function isHoldedConnectorAdminEmail(email: string | null | undefined) {
  return isPreconfiguredAdminEmail(email, process.env.ADMIN_EMAILS || '');
}

export function shouldEnforceHoldedConnectorAdmin(input?: {
  entryChannel?: string | null;
  force?: boolean;
}) {
  if (input?.force === true) return true;
  return (input?.entryChannel ?? 'dashboard') !== 'chatgpt';
}

export function assertHoldedConnectorAdminSessionAccess(
  session: { email?: string | null } | null | undefined,
  input?: { entryChannel?: string | null; force?: boolean }
) {
  if (!shouldEnforceHoldedConnectorAdmin(input)) {
    return;
  }

  if (!isHoldedConnectorAdminEmail(session?.email)) {
    throw new Error('FORBIDDEN: Holded connector admin access required');
  }
}

export async function requireHoldedConnectorAdminPageAccess(input?: { nextPath?: string }) {
  const { getSessionPayload } = await import('./session');
  const session = await getSessionPayload();
  const nextPath = input?.nextPath || '/dashboard/integrations/holded';

  if (!session?.uid || !session.email) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isHoldedConnectorAdminEmail(session.email)) {
    redirect('/dashboard/integrations?holded_admin=forbidden');
  }

  return session;
}

export function getHoldedConnectorAdminNotice() {
  return `Acceso restringido al panel admin del Conector Holded. Usa ${getPrimaryConnectorAdminEmail()} o una cuenta incluida en ADMIN_EMAILS.`;
}
