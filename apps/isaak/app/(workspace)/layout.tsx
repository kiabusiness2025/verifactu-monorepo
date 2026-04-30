import { redirect } from 'next/navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { listHoldedConversations } from '@/app/lib/holded-chat';
import { loadBillingData } from '@/app/lib/settings';
import IsaakSidebar from './components/IsaakSidebar';
import TrialBanner from './components/TrialBanner';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    redirect('/auth');
  }

  const [conversations, billing] = await Promise.all([
    listHoldedConversations({
      tenantId: session.tenantId,
      userId: session.userId,
    }).catch(() => []),
    loadBillingData({ tenantId: session.tenantId }).catch(() => null),
  ]);

  const user = {
    name: session.name ?? 'Usuario',
    email: session.email ?? '',
    initials: getInitials(session.name),
  };

  const showTrialBanner =
    billing?.status === 'trial' &&
    typeof billing.daysUntilTrialEnd === 'number' &&
    billing.daysUntilTrialEnd <= 14;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1a40] font-sans">
      <IsaakSidebar user={user} conversations={conversations} />
      <main className="relative flex flex-1 flex-col overflow-hidden bg-white">
        {showTrialBanner ? <TrialBanner daysLeft={billing!.daysUntilTrialEnd!} /> : null}
        {children}
      </main>
    </div>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
