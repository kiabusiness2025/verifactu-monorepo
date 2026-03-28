import type { Prisma, PrismaClient } from '@prisma/client';

const DEFAULT_CONTEXT = 'holded_free_dashboard';
const DEFAULT_TITLE = 'Chat con Isaak';
const RECENT_MESSAGE_LIMIT = 8;
const RECENT_CONVERSATION_LIMIT = 10;
const MEMORY_SCOPE_USER = 'user_private';

export type HoldedChatConversation = {
  id: string;
  title: string | null;
  context: string | null;
  summary: string | null;
  messageCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
};

export type IsaakChatSessionScope = {
  tenantId: string;
  userId: string;
};

export type IsaakChatPrismaClient = Pick<
  PrismaClient,
  '$transaction' | 'isaakConversation' | 'isaakConversationMsg' | 'isaakMemoryFact'
>;

function normalizeTitleFromMessage(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!normalized) return DEFAULT_TITLE;
  return normalized.length > 70 ? `${normalized.slice(0, 67)}...` : normalized;
}

function serializeConversation(conversation: {
  id: string;
  title: string | null;
  context: string | null;
  summary: string | null;
  messageCount: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}): HoldedChatConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    context: conversation.context,
    summary: conversation.summary,
    messageCount: conversation.messageCount,
    lastActivity: conversation.lastActivity.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages?.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function listTenantConversations(
  prisma: IsaakChatPrismaClient,
  scope: IsaakChatSessionScope
) {
  const conversations = await prisma.isaakConversation.findMany({
    where: {
      tenantId: scope.tenantId,
      userId: scope.userId,
      context: DEFAULT_CONTEXT,
    },
    orderBy: { lastActivity: 'desc' },
    take: RECENT_CONVERSATION_LIMIT,
  });

  return conversations.map(serializeConversation);
}

export async function getTenantConversation(
  prisma: IsaakChatPrismaClient,
  scope: IsaakChatSessionScope,
  conversationId: string
) {
  const conversation = await prisma.isaakConversation.findFirst({
    where: {
      id: conversationId,
      tenantId: scope.tenantId,
      userId: scope.userId,
      context: DEFAULT_CONTEXT,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return conversation ? serializeConversation(conversation) : null;
}

export async function ensureTenantConversation(
  prisma: IsaakChatPrismaClient,
  scope: IsaakChatSessionScope,
  input?: { conversationId?: string | null; titleSeed?: string | null }
) {
  const conversationId = input?.conversationId?.trim() || null;

  if (conversationId) {
    const existing = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: scope.tenantId,
        userId: scope.userId,
        context: DEFAULT_CONTEXT,
      },
    });

    if (existing) {
      return existing;
    }
  }

  return prisma.isaakConversation.create({
    data: {
      tenantId: scope.tenantId,
      userId: scope.userId,
      title: normalizeTitleFromMessage(input?.titleSeed || ''),
      context: DEFAULT_CONTEXT,
      lastActivity: new Date(),
    },
  });
}

export async function appendTenantConversationMessage(
  prisma: IsaakChatPrismaClient,
  input: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new Error('Message content is required');
  }

  const now = new Date();

  const [, message] = await prisma.$transaction([
    prisma.isaakConversation.update({
      where: { id: input.conversationId },
      data: {
        lastActivity: now,
        messageCount: {
          increment: 1,
        },
      },
    }),
    prisma.isaakConversationMsg.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: trimmed,
        metadata: input.metadata,
      },
    }),
  ]);

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function storeTenantMemoryFact(
  prisma: IsaakChatPrismaClient,
  input: {
    tenantId: string;
    userId: string;
    conversationId: string;
    category: string;
    factKey: string;
    value: Prisma.InputJsonValue;
    confidence?: number;
  }
) {
  const existing = await prisma.isaakMemoryFact.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      scope: MEMORY_SCOPE_USER,
      category: input.category,
      factKey: input.factKey,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (existing) {
    return prisma.isaakMemoryFact.update({
      where: { id: existing.id },
      data: {
        conversationId: input.conversationId,
        valueJson: input.value,
        source: 'holded_dashboard_mvp',
        confidence: input.confidence ?? 0.6,
        lastConfirmedAt: new Date(),
      },
    });
  }

  return prisma.isaakMemoryFact.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      conversationId: input.conversationId,
      scope: MEMORY_SCOPE_USER,
      category: input.category,
      factKey: input.factKey,
      valueJson: input.value,
      source: 'holded_dashboard_mvp',
      confidence: input.confidence ?? 0.6,
      lastConfirmedAt: new Date(),
    },
  });
}

export async function getTenantMemoryContext(
  prisma: IsaakChatPrismaClient,
  scope: IsaakChatSessionScope,
  conversationId: string
) {
  const [recentMessages, recentFacts] = await Promise.all([
    prisma.isaakConversationMsg.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_MESSAGE_LIMIT,
      select: {
        role: true,
        content: true,
      },
    }),
    prisma.isaakMemoryFact.findMany({
      where: {
        tenantId: scope.tenantId,
        userId: scope.userId,
        scope: MEMORY_SCOPE_USER,
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        category: true,
        factKey: true,
        valueJson: true,
      },
    }),
  ]);

  return {
    recentMessages: recentMessages.reverse(),
    recentFacts,
  };
}
