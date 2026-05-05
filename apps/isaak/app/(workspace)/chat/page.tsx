import type { Metadata } from 'next';
import IsaakChatSection from '../components/IsaakChatSection';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const metadata: Metadata = { title: 'Chat — Isaak' };

export default async function ChatPage() {
  const session = await getHoldedSession();
  const holdedConn = session?.tenantId
    ? await getHoldedConnection(session.tenantId).catch(() => null)
    : null;
  const holdedConnected = !!(holdedConn as { apiKey?: string } | null)?.apiKey;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Chat con Isaak</h1>
        <p className="text-[12px] text-slate-500">Pregunta lo que necesites sobre tu negocio</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection
          context="default"
          userName={session?.name ?? null}
          holdedConnected={holdedConnected}
          welcomeSubtitle="Pregúntame por ventas, gastos, cobros, proyectos o cualquier duda sobre tu negocio."
        />
      </div>
    </div>
  );
}
