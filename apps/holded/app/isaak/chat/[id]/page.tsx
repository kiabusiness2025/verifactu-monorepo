import { notFound } from 'next/navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import IsaakChatMain from '../../components/IsaakChatMain';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const conv = await prisma.isaakConversation
    .findUnique({ where: { id }, select: { title: true } })
    .catch(() => null);
  return { title: `${conv?.title ?? 'Chat'} — Isaak` };
}

export default async function IsaakConversationPage({ params }: Props) {
  const { id } = await params;
  const session = await getHoldedSession();

  const conv = await prisma.isaakConversation
    .findFirst({
      where: { id, tenantId: session?.tenantId ?? '' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 60,
          select: { role: true, content: true },
        },
      },
    })
    .catch(() => null);

  if (!conv) notFound();

  const initialMessages = conv.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  return <IsaakChatMain conversationId={id} initialMessages={initialMessages} context="default" />;
}
