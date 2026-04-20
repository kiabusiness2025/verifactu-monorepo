import { HoldedDirectConversationsSection } from '@/components/admin/HoldedDirectControlSections';
import { listHoldedDirectConversations } from '@/lib/holdedDirectAdmin';

export const dynamic = 'force-dynamic';

export default async function HoldedDirectConversationsPage() {
  const conversations = await listHoldedDirectConversations(40);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Historial de conversaciones</h1>
        <p className="mt-2 text-sm text-slate-600">
          Conversaciones recientes asociadas al conector directo Holded + ChatGPT.
        </p>
      </header>

      <HoldedDirectConversationsSection
        title="Conversaciones"
        description="Registro reciente con usuario, tenant y últimos mensajes visibles."
        conversations={conversations}
      />
    </main>
  );
}
