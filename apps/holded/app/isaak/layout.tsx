import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import IsaakSidebar from './components/IsaakSidebar';

export const metadata: Metadata = {
  title: 'Isaak — Tu asistente de negocio',
  description: 'Habla con tu empresa. Datos reales de Holded en lenguaje natural.',
};

export default async function IsaakLayout({ children }: { children: React.ReactNode }) {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect(`/auth/holded?next=${encodeURIComponent('/isaak/chat')}`);
  }

  // Load last 20 conversations for sidebar history
  const conversations = await prisma.isaakConversation
    .findMany({
      where: { tenantId: session.tenantId, context: 'holded_chat' },
      orderBy: { lastActivity: 'desc' },
      take: 20,
      select: { id: true, title: true, lastActivity: true, messageCount: true },
    })
    .catch(() => []);

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
