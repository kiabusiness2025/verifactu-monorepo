import { getSessionPayload } from '@/lib/session';
import { getWorkspaceStateFromSession } from '@/src/server/workspace';
import { redirect } from 'next/navigation';

export default async function WorkspaceRedirectPage() {
  const session = await getSessionPayload();
  if (!session?.uid) {
    redirect('/login');
  }

  const workspace = await getWorkspaceStateFromSession(session);
  const activeTenant =
    workspace.tenants.find((tenant) => tenant.id === workspace.activeTenantId) ??
    workspace.tenants[0];

  if (!activeTenant) {
    redirect('/login');
  }

  redirect(`/t/${activeTenant.slug}/dashboard`);
}
