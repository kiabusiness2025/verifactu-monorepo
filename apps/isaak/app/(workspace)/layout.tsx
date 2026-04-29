import { redirect } from 'next/navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { listHoldedConversations } from '@/app/lib/holded-chat';
import { buildHoldedAuthUrl } from '@/app/lib/isaak-navigation';
import IsaakSidebar from './components/IsaakSidebar';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    redirect(
      buildHoldedAuthUrl('workspace_requires_session', 'https://isaak.verifactu.business/chat')
    );
  }

  const conversations = await listHoldedConversations({
    tenantId: session.tenantId,
    userId: session.userId,
  }).catch(() => []);

  const user = {
    name: session.name ?? 'Usuario',
    email: session.email ?? '',
    initials: getInitials(session.name),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      <IsaakSidebar user={user} conversations={conversations} />
      <main className="relative flex flex-1 flex-col overflow-hidden bg-white">{children}</main>
    </div>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
