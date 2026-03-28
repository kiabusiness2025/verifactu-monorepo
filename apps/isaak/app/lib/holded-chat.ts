import {
  appendTenantConversationMessage,
  ensureTenantConversation,
  getTenantConversation,
  getTenantMemoryContext,
  listTenantConversations,
  storeTenantMemoryFact,
  type HoldedChatConversation,
} from '@verifactu/integrations';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type SessionScope = {
  tenantId: string;
  userId: string;
};

export type { HoldedChatConversation };

export async function listHoldedConversations(scope: SessionScope) {
  return listTenantConversations(prisma, scope);
}

export async function getHoldedConversation(scope: SessionScope, conversationId: string) {
  return getTenantConversation(prisma, scope, conversationId);
}

export async function ensureHoldedConversation(
  scope: SessionScope,
  input?: { conversationId?: string | null; titleSeed?: string | null }
) {
  return ensureTenantConversation(prisma, scope, input);
}

export async function appendConversationMessage(input: {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return appendTenantConversationMessage(prisma, input);
}

export async function storeSimpleMemoryFact(input: {
  tenantId: string;
  userId: string;
  conversationId: string;
  category: string;
  factKey: string;
  value: Prisma.InputJsonValue;
  confidence?: number;
}) {
  return storeTenantMemoryFact(prisma, input);
}

export async function getSimpleMemoryContext(scope: SessionScope, conversationId: string) {
  return getTenantMemoryContext(prisma, scope, conversationId);
}
