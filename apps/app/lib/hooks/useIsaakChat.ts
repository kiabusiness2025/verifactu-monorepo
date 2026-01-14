/**
 * Hook para manejar conversaciones con Isaak
 * Gestiona el almacenamiento y recuperación de chats
 */

import { useState, useCallback, useEffect } from 'react';

export interface IsaakMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface IsaakConversation {
  id: string;
  title: string;
  context?: string;
  summary?: string;
  messageCount: number;
  messages: IsaakMessage[];
  lastActivity: string;
}

export interface UseIsaakChatOptions {
  conversationId?: string;
  autoLoad?: boolean;
}

export function useIsaakChat(options: UseIsaakChatOptions = {}) {
  const { conversationId, autoLoad = true } = options;

  const [conversation, setConversation] = useState<IsaakConversation | null>(null);
  const [conversations, setConversations] = useState<IsaakConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar conversaciones
  const loadConversations = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/isaak/conversations?${params}`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to load conversations');
      const data = await response.json();
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar conversación específica
  const loadConversation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/isaak/conversations/${id}`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to load conversation');
      const data = await response.json();
      setConversation(data.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nueva conversación
  const createConversation = useCallback(async (title?: string, context?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/isaak/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, context }),
      });

      if (!response.ok) throw new Error('Failed to create conversation');
      const data = await response.json();
      setConversation(data.conversation);
      return data.conversation;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error creating conversation';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Guardar mensaje
  const saveMessage = useCallback(
    async (role: 'user' | 'assistant', content: string, tokens?: number, metadata?: any) => {
      if (!conversation?.id) {
        throw new Error('No conversation selected');
      }

      setError(null);
      try {
        const response = await fetch(
          `/api/isaak/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, content, tokens, metadata }),
          }
        );

        if (!response.ok) throw new Error('Failed to save message');
        const data = await response.json();

        // Actualizar conversación localmente
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, data.message],
                messageCount: prev.messageCount + 1,
                lastActivity: new Date().toISOString(),
              }
            : null
        );

        return data.message;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error saving message';
        setError(errorMsg);
        throw err;
      }
    },
    [conversation?.id]
  );

  // Eliminar mensaje
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversation?.id) {
        throw new Error('No conversation selected');
      }

      setError(null);
      try {
        const response = await fetch(
          `/api/isaak/conversations/${conversation.id}/messages/${messageId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) throw new Error('Failed to delete message');

        // Actualizar localmente
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((m) => m.id !== messageId),
                messageCount: prev.messageCount - 1,
              }
            : null
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error deleting message';
        setError(errorMsg);
        throw err;
      }
    },
    [conversation?.id]
  );

  // Actualizar conversación
  const updateConversation = useCallback(
    async (updates: Partial<IsaakConversation>) => {
      if (!conversation?.id) {
        throw new Error('No conversation selected');
      }

      setError(null);
      try {
        const response = await fetch(`/api/isaak/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update conversation');
        const data = await response.json();
        setConversation(data.conversation);
        return data.conversation;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error updating conversation';
        setError(errorMsg);
        throw err;
      }
    },
    [conversation?.id]
  );

  // Eliminar conversación
  const deleteConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/isaak/conversations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      // Actualizar lista
      setConversations((prev) => prev.filter((c) => c.id !== id));

      // Si es la actual, limpiar
      if (conversation?.id === id) {
        setConversation(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error deleting conversation';
      setError(errorMsg);
      throw err;
    }
  }, [conversation?.id]);

  // Cargar al montar
  useEffect(() => {
    if (autoLoad) {
      loadConversations();

      if (conversationId) {
        loadConversation(conversationId);
      }
    }
  }, [autoLoad, conversationId, loadConversations, loadConversation]);

  return {
    conversation,
    conversations,
    loading,
    error,
    loadConversations,
    loadConversation,
    createConversation,
    saveMessage,
    deleteMessage,
    updateConversation,
    deleteConversation,
  };
}
