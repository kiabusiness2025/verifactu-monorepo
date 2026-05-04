import { redirect } from 'next/navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { listHoldedConversations } from '@/app/lib/holded-chat';
import { loadBillingData } from '@/app/lib/settings';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import IsaakSidebar from './components/IsaakSidebar';
import IsaakCopilotPanel from './components/IsaakCopilotPanel';
import TrialBanner from './components/TrialBanner';

// All routes in this group are auth-required and read cookies/session at request
// time (getHoldedSession). They cannot be statically prerendered. Forcing dynamic
// here avoids prerender errors like "useContext during prerender" on /integrations
// when child Client Components (IsaakSidebar, IsaakCopilotPanel, IntegrationsClient)
// are evaluated without a real React context tree at build time.
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    redirect('/auth');
  }

  const [conversations, billing, holdedConn] = await Promise.all([
    listHoldedConversations({
      tenantId: session.tenantId,
      userId: session.userId,
    }).catch(() => []),
    loadBillingData({ tenantId: session.tenantId }).catch(() => null),
    getHoldedConnection(session.tenantId).catch(() => null),
  ]);

  const user = {
    name: session.name ?? 'Usuario',
    email: session.email ?? '',
    initials: getInitials(session.name),
  };

  const planInfo = {
    name: billing?.name ?? 'Free',
    code: billing?.code ?? 'free',
    status: billing?.status ?? 'active',
    daysLeft: billing?.daysUntilTrialEnd ?? null,
  };

  const holdedConnected = !!(holdedConn as { apiKey?: string } | null)?.apiKey;

  const showTrialBanner =
    billing?.status === 'trial' &&
    typeof billing.daysUntilTrialEnd === 'number' &&
    billing.daysUntilTrialEnd <= 3;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1a40] font-sans">
      <IsaakSidebar
        user={user}
        conversations={conversations}
        planInfo={planInfo}
        holdedConnected={holdedConnected}
      />
      <main className="relative flex flex-1 overflow-hidden bg-white">
        <div className="flex flex-1 flex-col overflow-hidden">
          {showTrialBanner ? <TrialBanner daysLeft={billing!.daysUntilTrialEnd!} /> : null}
          {children}
        </div>
        <IsaakCopilotPanel />
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
