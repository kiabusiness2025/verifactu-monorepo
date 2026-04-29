import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConversation, type HoldedChatConversation } from '@/app/lib/holded-chat';
import IsaakChatSectionHydrated from '../../components/IsaakChatSectionHydrated';

export const metadata: Metadata = { title: 'Chat — Isaak' };

type Props = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) notFound();

  const conversation: HoldedChatConversation | null = await getHoldedConversation(
    { tenantId: session.tenantId, userId: session.userId },
    id
  ).catch(() => null);

  if (!conversation) notFound();

  const messages = (conversation.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <h1 className="truncate text-[15px] font-semibold text-slate-900">
          {conversation.title ?? 'Conversación'}
        </h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatSectionHydrated conversationId={id} initialMessages={messages} />
      </div>
    </div>
  );
}
