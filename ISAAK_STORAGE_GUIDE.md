# 🧠 ISAAK Chat Storage Integration Guide

## Overview

El sistema de almacenamiento de conversaciones con Isaak permite:
- ✅ Guardar automáticamente cada mensaje (user + assistant)
- ✅ Ver historial de conversaciones
- ✅ Buscar en conversaciones anteriores
- ✅ Análisis de patrones de preguntas
- ✅ Contexto para respuestas más inteligentes

## Database Schema

Se agregaron 2 modelos a Prisma:

### `IsaakConversation`
```prisma
model IsaakConversation {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  title       String?  // Auto-generado o custom
  context     String?  // Categoría (facturas, impuestos, etc)
  summary     String?  // Resumen generado
  messageCount Int    @default(0)
  lastActivity DateTime
  createdAt   DateTime @default(now())
  
  tenant   Tenant                @relation(...)
  user     User                  @relation(...)
  messages IsaakConversationMsg[]
}
```

### `IsaakConversationMsg`
```prisma
model IsaakConversationMsg {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  conversationId String @map("conversation_id") @db.Uuid
  role           String // "user" o "assistant"
  content        String // El mensaje
  tokens         Int?   // Tokens Vertex AI
  metadata       Json?  // Datos adicionales
  createdAt      DateTime @default(now())
  
  conversation IsaakConversation @relation(...)
}
```

## API Endpoints

### Conversaciones

```bash
# Listar conversaciones del usuario
GET /api/isaak/conversations
  ?limit=20&offset=0&search=facturas

# Crear nueva conversación
POST /api/isaak/conversations
  { "title": "Preguntas sobre IVA", "context": "taxes" }

# Obtener conversación con mensajes
GET /api/isaak/conversations/{id}

# Actualizar conversación
PATCH /api/isaak/conversations/{id}
  { "title": "Nuevo título", "summary": "..." }

# Eliminar conversación
DELETE /api/isaak/conversations/{id}
```

### Mensajes

```bash
# Guardar mensaje en conversación
POST /api/isaak/conversations/{id}/messages
  {
    "role": "user",
    "content": "¿Cómo calculo el IVA?",
    "tokens": 15,
    "metadata": { "mood": "curious" }
  }

# Obtener mensajes de conversación
GET /api/isaak/conversations/{id}/messages
  ?limit=50&offset=0

# Eliminar mensaje
DELETE /api/isaak/conversations/{id}/messages/{messageId}
```

## React Hooks

### `useIsaakChat(options)`

```typescript
import { useIsaakChat } from '@/lib/hooks/useIsaakChat';

function MyComponent() {
  const {
    conversation,      // Conversación actual
    conversations,     // Todas las conversaciones
    loading,           // Estado de carga
    error,             // Errores
    
    loadConversations, // (search?: string) => Promise<void>
    loadConversation,  // (id: string) => Promise<void>
    createConversation,// (title?, context?) => Promise<Conversation>
    saveMessage,       // (role, content, tokens?, metadata?) => Promise<Message>
    deleteMessage,     // (messageId) => Promise<void>
    updateConversation,// (updates) => Promise<Conversation>
    deleteConversation,// (id) => Promise<void>
  } = useIsaakChat({
    conversationId: 'optional-id-to-load',
    autoLoad: true
  });

  // Uso:
  const handleSendMessage = async (userMessage: string) => {
    // 1. Guardar mensaje usuario
    await saveMessage('user', userMessage);
    
    // 2. Obtener respuesta de Vertex AI
    const response = await fetch('/api/vertex-chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage })
    });
    
    // 3. Guardar respuesta
    const data = await response.json();
    await saveMessage('assistant', data.text);
  };
}
```

### `useIsaakChatStorage(context?)`

Hook simplificado que auto-inicializa:

```typescript
import { useIsaakChatStorage } from '@/lib/isaakChatStorage';

function ChatComponent() {
  const {
    conversationId,
    messages,
    saveMessage,
    loadHistory
  } = useIsaakChatStorage('facturas');

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id} className={msg.role}>
          {msg.content}
        </div>
      ))}
      {/* Input */}
    </div>
  );
}
```

## Utility Functions

### `sendIsaakMessageWithStorage(userMessage, conversationId)`

Función helper que maneja todo automáticamente:

```typescript
import { sendIsaakMessageWithStorage } from '@/lib/isaakChatStorage';

const { response, messageId } = await sendIsaakMessageWithStorage(
  "¿Cómo hago una factura?",
  conversationId
);

console.log(response); // Respuesta de Isaak
```

Esto:
1. Guarda el mensaje del usuario
2. Llama a `/api/vertex-chat`
3. Guarda la respuesta de Isaak
4. Retorna todo automáticamente

## Integration Examples

### Ejemplo 1: Component Simple

```typescript
'use client';
import { useIsaakChatStorage } from '@/lib/isaakChatStorage';
import { useState } from 'react';

export function IsaakChat() {
  const { conversationId, messages, saveMessage } = useIsaakChatStorage();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    // Tu lógica de envío que usa saveMessage
    await saveMessage('user', input);
    setInput('');
  };

  return (
    <div className="chat">
      {messages.map(msg => (
        <div key={msg.id} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={handleSend}>Enviar</button>
    </div>
  );
}
```

### Ejemplo 2: Con Full Control

```typescript
'use client';
import { useIsaakChat } from '@/lib/hooks/useIsaakChat';

export function IsaakChatAdvanced() {
  const {
    conversation,
    conversations,
    createConversation,
    saveMessage,
    deleteConversation
  } = useIsaakChat({ autoLoad: true });

  const handleNewChat = async () => {
    const conv = await createConversation('Mi nueva conversación');
    // Usar conv.id
  };

  const handleDeleteChat = async (id: string) => {
    await deleteConversation(id);
  };

  return (
    <div>
      <button onClick={handleNewChat}>+ Nueva conversación</button>
      
      <div className="conversation-list">
        {conversations.map(conv => (
          <div key={conv.id} className="conversation-item">
            <h3>{conv.title}</h3>
            <p>{conv.messageCount} mensajes</p>
            <button onClick={() => handleDeleteChat(conv.id)}>Eliminar</button>
          </div>
        ))}
      </div>

      {conversation && (
        <div className="chat-area">
          <h2>{conversation.title}</h2>
          {conversation.messages.map(msg => (
            <div key={msg.id}>{msg.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Ejemplo 3: HOC Wrapper

```typescript
import { withIsaakStorage } from '@/lib/isaakChatStorage';

// Tu componente de chat existente
function ChatUI(props: {
  onSaveMessage: (role: string, content: string) => Promise<void>;
  conversationId: string | null;
}) {
  // ... tu UI de chat
}

// Envolver con almacenamiento
export const IsaakChat = withIsaakStorage(ChatUI);
```

## Migration: Current Chat to Persistent

Si ya tienes un componente de chat:

```typescript
// ANTES: Sin almacenamiento
const [messages, setMessages] = useState([]);

// DESPUÉS: Con almacenamiento
const { messages, saveMessage } = useIsaakChatStorage();

// En tu handler de envío:
const handleSend = async (userInput: string) => {
  // 1. Guardar mensaje usuario
  await saveMessage('user', userInput);
  
  // 2. Get Isaak response
  const res = await fetch('/api/vertex-chat', {
    method: 'POST',
    body: JSON.stringify({ message: userInput })
  });
  const data = await res.json();
  
  // 3. Guardar respuesta
  await saveMessage('assistant', data.text);
};
```

## Database Migration

Necesitas ejecutar:

```bash
# Generar migration
npx prisma migrate dev --name add_isaak_conversations

# O si está en dev/local:
npx prisma db push
```

## Monitoring & Analytics

Con el almacenamiento, puedes:

```typescript
// Preguntas más frecuentes
const stats = await prisma.isaakConversationMsg.groupBy({
  by: ['content'],
  where: { role: 'user' },
  _count: true,
  orderBy: { _count: { id: 'desc' } }
});

// Satisfacción (custom metadata)
const satisfaction = await prisma.isaakConversationMsg.findMany({
  where: { 
    role: 'assistant',
    metadata: { path: ['rating'], equals: 5 }
  }
});
```

## Best Practices

1. **Auto-guardar**: Usa `useIsaakChatStorage()` para simplificar
2. **Contexto**: Especifica `context` al crear conversaciones
3. **Limpieza**: Elimina conversaciones antiguas regularmente
4. **Tokens**: Guarda info de tokens para monitoreo de costos
5. **Metadata**: Agrega custom data (mood, category, etc)

---

**Next Steps:**
1. Ejecutar migration de Prisma
2. Integrar en tu componente de chat
3. Probar guardar/recuperar mensajes
4. Agregar UI de historial
