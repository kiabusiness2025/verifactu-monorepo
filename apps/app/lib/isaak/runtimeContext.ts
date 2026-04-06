import { prisma } from '@/lib/prisma';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { normalizeIsaakContext } from '@/lib/isaak/persona';

type BuildIsaakRuntimeContextInput = {
  tenantId?: string | null;
  userId?: string | null;
  context?: string | null;
  section?: string | null;
  conversationId?: string | null;
};

type IsaakRuntimeContext = {
  systemBlock: string;
};

function formatConversationLine(item: {
  title: string | null;
  summary: string | null;
  context: string | null;
  messageCount: number;
}): string {
  const parts = [item.title?.trim() || 'Conversacion sin titulo'];

  if (item.summary?.trim()) {
    parts.push(`resumen: ${item.summary.trim()}`);
  }

  if (item.context?.trim()) {
    parts.push(`contexto: ${item.context.trim()}`);
  }

  parts.push(`mensajes: ${item.messageCount}`);

  return `- ${parts.join(' | ')}`;
}

function formatMessageLine(item: { role: string; content: string }): string {
  const content = item.content.replace(/\s+/g, ' ').trim();
  const compact = content.length > 180 ? `${content.slice(0, 177)}...` : content;
  return `- ${item.role}: ${compact}`;
}

function formatPreferenceLine(preferredTenantName?: string | null): string | null {
  if (!preferredTenantName?.trim()) return null;
  return `- tenant preferido guardado: ${preferredTenantName.trim()}`;
}

function formatHoldedLine(input: {
  connected: boolean;
  lastSyncAt?: Date | string | null;
  lastError?: string | null;
}): string {
  if (!input.connected) {
    return '- estado Holded: sin conexion activa';
  }

  const parts = ['- estado Holded: conectado'];
  const lastSyncAt =
    typeof input.lastSyncAt === 'string' ? new Date(input.lastSyncAt) : (input.lastSyncAt ?? null);
  if (lastSyncAt && !Number.isNaN(lastSyncAt.getTime())) {
    parts.push(`ultimo sync: ${lastSyncAt.toISOString()}`);
  }
  if (input.lastError?.trim()) parts.push(`ultimo error registrado: ${input.lastError.trim()}`);
  return parts.join(' | ');
}

export async function buildIsaakRuntimeContext(
  input: BuildIsaakRuntimeContextInput
): Promise<IsaakRuntimeContext> {
  const tenantId = input.tenantId ?? null;
  const userId = input.userId ?? null;

  if (!tenantId || !userId) {
    return { systemBlock: '' };
  }

  try {
    const normalizedContext = normalizeIsaakContext(input.context);
    const activeConversationId = input.conversationId ?? null;

    const [preferredTenant, recentConversations, recentMessages, holdedConnection] =
      await Promise.all([
        prisma.userPreference.findUnique({
          where: { userId },
          select: {
            preferredTenant: {
              select: { name: true },
            },
          },
        }),
        prisma.isaakConversation.findMany({
          where: {
            tenantId,
            userId,
            ...(activeConversationId ? { id: { not: activeConversationId } } : {}),
          },
          orderBy: { lastActivity: 'desc' },
          take: 3,
          select: {
            title: true,
            summary: true,
            context: true,
            messageCount: true,
          },
        }),
        prisma.isaakConversationMsg.findMany({
          where: activeConversationId
            ? { conversationId: activeConversationId }
            : { conversation: { tenantId, userId } },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            role: true,
            content: true,
          },
        }),
        resolveSharedHoldedConnectionStatusForTenant(tenantId, 'dashboard'),
      ]);

    const blocks: string[] = [];

    const preferenceLine = formatPreferenceLine(preferredTenant?.preferredTenant?.name ?? null);
    if (preferenceLine) {
      blocks.push(`Preferencias operativas recordadas:
${preferenceLine}`);
    }

    const holdedLine = formatHoldedLine({
      connected: holdedConnection?.status === 'connected',
      lastSyncAt: holdedConnection?.lastSyncAt ?? null,
      lastError: holdedConnection?.lastError ?? null,
    });
    blocks.push(`Estado de integracion:
${holdedLine}`);

    if (recentConversations.length > 0) {
      blocks.push(
        `Memoria conversacional reciente del usuario (${normalizedContext}):
${recentConversations.map(formatConversationLine).join('\n')}`
      );
    }

    if (recentMessages.length > 0) {
      blocks.push(
        `Mensajes recientes a tener en cuenta antes de responder:
${recentMessages.slice().reverse().map(formatMessageLine).join('\n')}`
      );
    }

    if (blocks.length === 0) {
      return { systemBlock: '' };
    }

    return {
      systemBlock: [
        'Memoria privada de Isaak para esta respuesta. Usala como contexto de trabajo, sin citarla de forma literal salvo que el usuario lo pida.',
        ...blocks,
      ].join('\n\n'),
    };
  } catch (error) {
    console.error('[Isaak Runtime Context] Failed to build runtime context', error);
    return { systemBlock: '' };
  }
}
