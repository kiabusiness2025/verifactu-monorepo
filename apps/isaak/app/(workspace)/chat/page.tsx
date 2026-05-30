import type { Metadata } from 'next';
import IsaakChatSection from '../components/IsaakChatSection';
import AdvisorModeBanner from '../components/AdvisorModeBanner';
import OnboardingBanner from '../components/OnboardingBanner';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { loadIsaakWorkspaceSignals } from '@/app/lib/isaak-workspace-signals';
import { getActiveAdvisorClientId } from '@/app/lib/advisor-session';
import { prisma } from '@/app/lib/prisma';

export const metadata: Metadata = { title: 'Chat — Isaak' };

export default async function ChatPage() {
  const [session, advisorClientId] = await Promise.all([
    getHoldedSession(),
    getActiveAdvisorClientId().catch(() => null),
  ]);

  const holdedConn = session?.tenantId
    ? await getHoldedConnection(session.tenantId).catch(() => null)
    : null;
  const holdedConnected = !!(holdedConn as { apiKey?: string } | null)?.apiKey;

  const signals = session?.tenantId
    ? await loadIsaakWorkspaceSignals({ tenantId: session.tenantId }).catch(() => null)
    : null;
  const isFreePlan = !signals || signals.billing.code === 'free';

  const advisorClient =
    advisorClientId && session?.tenantId
      ? await prisma.advisorClient
          .findUnique({
            where: { id: advisorClientId },
            select: {
              id: true,
              alias: true,
              companyName: true,
              advisorTenantId: true,
              isActive: true,
            },
          })
          .catch(() => null)
      : null;

  const activeAdvisorClient =
    advisorClient?.isActive && advisorClient.advisorTenantId === session?.tenantId
      ? advisorClient
      : null;

  return (
    <div className="flex h-full flex-col">
      {activeAdvisorClient && (
        <AdvisorModeBanner
          clientAlias={activeAdvisorClient.alias}
          clientCompanyName={activeAdvisorClient.companyName}
        />
      )}
      {!activeAdvisorClient && <OnboardingBanner />}
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection
          context="default"
          userName={session?.name ?? null}
          holdedConnected={holdedConnected || !!activeAdvisorClient}
          isFreePlan={isFreePlan}
          welcomeSubtitle={
            activeAdvisorClient
              ? `Modo asesoría — consultando datos de ${activeAdvisorClient.companyName || activeAdvisorClient.alias}`
              : 'Pregúntame por ventas, gastos, cobros, IVA o cualquier duda fiscal.'
          }
        />
      </div>
    </div>
  );
}
