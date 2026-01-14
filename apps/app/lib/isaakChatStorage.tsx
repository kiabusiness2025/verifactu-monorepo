/**
 * Component: IsaakChatWithStorage
 * Envuelve el chat de Isaak con almacenamiento automático de conversaciones
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useIsaakChat } from '@/lib/hooks/useIsaakChat';

interface IsaakChatWithStorageProps {
  onConversationLoaded?: (conversationId: string) => void;
  context?: string;
}

/**
 * HOC que envuelve un componente de chat para agregar almacenamiento
 */
export function withIsaakStorage<P extends object>(
  ChatComponent: React.ComponentType<P & { onSaveMessage: (role: string, content: string) => Promise<void>; conversationId: string | null }>
) {
  return function IsaakChatWithStorageWrapper(props: P & IsaakChatWithStorageProps) {
    const { onConversationLoaded, context, ...chatProps } = props;
    const {
      conversation,
      createConversation,
      saveMessage,
      deleteConversation,
    } = useIsaakChat({ autoLoad: true });

    const conversationInitialized = useRef(false);

    // Crear conversación inicial
    useEffect(() => {
      if (!conversationInitialized.current && !conversation) {
        createConversation('Chat con Isaak', context).then((conv) => {
          conversationInitialized.current = true;
          onConversationLoaded?.(conv.id);
        });
      }
    }, [conversation, createConversation, context, onConversationLoaded]);

    const handleSaveMessage = async (role: string, content: string) => {
      if (!conversation) {
        throw new Error('No conversation available');
      }
      await saveMessage(role as 'user' | 'assistant', content);
    };

    return (
      <ChatComponent
        {...(chatProps as P)}
        onSaveMessage={handleSaveMessage}
        conversationId={conversation?.id || null}
      />
    );
  };
}

/**
 * Hook para usar en componentes de chat
 * Gestiona automáticamente el almacenamiento
 */
export function useIsaakChatStorage(context?: string) {
  const {
    conversation,
    createConversation,
    saveMessage,
    loadConversations,
  } = useIsaakChat({ autoLoad: true });

  const conversationInitialized = useRef(false);

  // Inicializar conversación
  useEffect(() => {
    if (!conversationInitialized.current && !conversation) {
      createConversation('Chat con Isaak', context).then(() => {
        conversationInitialized.current = true;
      });
    }
  }, [conversation, createConversation, context]);

  return {
    conversationId: conversation?.id,
    messages: conversation?.messages || [],
    saveMessage: async (role: 'user' | 'assistant', content: string) => {
      if (!conversation?.id) {
        throw new Error('No conversation available');
      }
      return saveMessage(role, content);
    },
    loadHistory: loadConversations,
  };
}

/**
 * Utility para integrar en el endpoint de Vertex Chat
 * Llama al endpoint y guarda automáticamente
 */
export async function sendIsaakMessageWithStorage(
  userMessage: string,
  conversationId: string | null
): Promise<{ response: string; messageId?: string }> {
  try {
    // 1. Guardar mensaje del usuario
    if (conversationId) {
      const userResponse = await fetch(`/api/isaak/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: userMessage,
        }),
      });

      if (!userResponse.ok) {
        console.warn('Failed to save user message');
      }
    }

    // 2. Enviar a Vertex AI
    const vertexResponse = await fetch('/api/vertex-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!vertexResponse.ok) {
      throw new Error('Failed to get AI response');
    }

    const vertexData = await vertexResponse.json();
    const aiResponse = vertexData.text || 'Sin respuesta';

    // 3. Guardar respuesta del asistente
    let messageId: string | undefined;
    if (conversationId) {
      const assistantResponse = await fetch(`/api/isaak/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: aiResponse,
          metadata: {
            model: 'vertex-ai',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (assistantResponse.ok) {
        const data = await assistantResponse.json();
        messageId = data.message?.id;
      }
    }

    return {
      response: aiResponse,
      messageId,
    };
  } catch (error) {
    console.error('[ISAAK] Error in sendIsaakMessageWithStorage:', error);
    throw error;
  }
}
