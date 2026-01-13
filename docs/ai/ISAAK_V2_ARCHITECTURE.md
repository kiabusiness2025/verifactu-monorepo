# ISAAK V2.0 - ARQUITECTURA & FLUJOS

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useIsaakDetection Hook                             │  │
│  │  ├─ pathname (usePathname)                          │  │
│  │  ├─ navigator.language                              │  │
│  │  ├─ Determina: context, role, language, path       │  │
│  │  └─ Retorna: IsaakDetection object                 │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓                                    ↓            │
│  ┌──────────────────────┐    ┌─────────────────────────┐  │
│  │useProactive Messages │    │ IsaakSmartFloating      │  │
│  ├──────────────────────┤    ├─────────────────────────┤  │
│  │Gets relevant messages│    │Greeting + Suggestions   │  │
│  │by context+role+lang  │    │Chat bubble window       │  │
│  └──────────────────────┘    │Streaming responses      │  │
│           ↓                    └─────────────────────────┘  │
│  ┌──────────────────────┐                                 │
│  │ProactiveBubbles      │                                 │
│  ├──────────────────────┤                                 │
│  │Shows toast messages  │                                 │
│  │with delays & icons   │                                 │
│  └──────────────────────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
            ↓                              ↓
        user sends                    user clicks
        message                       suggestion
            ↓                              ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Next.js API Route)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /api/chat                                           │
│  ├─ Recibe: messages[] + context{}                        │
│  ├─ buildIsaakSystem(context.type)                        │
│  ├─ System prompt adaptado:                               │
│  │  ├─ Si landing: brief, friendly, no tech             │
│  │  ├─ Si dashboard: practical, direct, data-driven     │
│  │  └─ Si admin: technical, business info               │
│  ├─ Llama a GPT-4 Turbo con tools                         │
│  └─ Retorna: streaming response                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│              i18n Files (Translations)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  isaak-messages-i18n.ts                                   │
│  ├─ PROACTIVE_MESSAGES_I18N[lang][context][role]         │
│  └─ Mensajes en: ES, EN, PT, FR                           │
│                                                             │
│  isaak-floating-contexts-i18n.ts                          │
│  ├─ ISAAK_FLOATING_CONTEXTS_I18N[lang][context:role]     │
│  ├─ greeting, suggestions, prompt                         │
│  └─ Languages: ES, EN, PT, FR                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Detección

```
Usuario entra en página
         ↓
┌─────────────────────────────────────────┐
│  useIsaakDetection() ejecuta:           │
├─────────────────────────────────────────┤
│ 1. pathname = usePathname()             │
│    ├─ "/dashboard" → context="dashboard"│
│    ├─ "/dashboard/admin" → context="admin"
│    └─ "/" → context="landing"          │
│                                         │
│ 2. rol = detectado por context         │
│    ├─ landing → role="visitor"         │
│    ├─ dashboard → role="user"          │
│    └─ admin → role="admin"             │
│                                         │
│ 3. language = navigator.language       │
│    ├─ "es-ES" → "es"                  │
│    ├─ "en-US" → "en"                  │
│    └─ fallback → "es"                 │
│                                         │
│ 4. company = localStorage.get()         │
│                                         │
└─────────────────────────────────────────┘
         ↓
    Retorna:
    {
      context: "dashboard" | "landing" | "admin",
      role: "user" | "visitor" | "admin",
      language: "es" | "en" | "pt" | "fr",
      path: string,
      company?: string
    }
```

---

## 💬 Flujo de Mensajes Proactivos

```
useIsaakDetection()
         ↓
    {context, role, language}
         ↓
useProactiveMessages()
         ↓
getProactiveMessages(language, context, role)
         ↓
PROACTIVE_MESSAGES_I18N[es][dashboard][user]
         ↓
[
  {id: "daily-check", delay: 2000, message: "📊 Tu resumen..."},
  {id: "veri-reminder", delay: 10000, message: "⏰ Recordatorio..."},
  {id: "expense-smart", delay: 15000, message: "💡 Gastos inteligentes..."}
]
         ↓
IsaakProactiveBubbles renderiza
         ↓
Busca cada delay → setInterval → aparecen gradualmente
         ↓
Usuario ve burbujas en bottom-24 right-6
```

---

## 💬 Flujo de Chat Flotante

```
Usuario abre chat
         ↓
IsaakSmartFloating monta
         ↓
useIsaakDetection() → {context, role, language}
         ↓
getIsaakFloatingContext(language, context, role)
         ↓
ISAAK_FLOATING_CONTEXTS_I18N[es][dashboard:user]
         ↓
{
  greeting: "Hola de nuevo 👋 ¿Qué necesitas?",
  suggestions: ["Mi beneficio", "Subir gasto", "Facturas pendientes"],
  prompt: "Soy Isaak, asistente personal..."
}
         ↓
Se muestra greeting + 3 botones de suggestions
         ↓
Usuario clickea suggestion
         ↓
Se auto-completa input
         ↓
Usuario envía
         ↓
Mensaje → /api/chat con context
         ↓
Respuesta + streaming
```

---

## 🔗 Flujo de Chat API

```
Cliente (IsaakSmartFloating)
         ↓
POST /api/chat
{
  messages: [...],
  context: {
    type: "dashboard",
    role: "user",
    language: "es",
    company?: "tenant-id"
  }
}
         ↓
Servidor (/api/chat/route.ts)
         ↓
buildIsaakSystem(contextType)
         ↓
Elige system prompt según context:
- Landing: brief, casual, cautivador
- Dashboard: practical, direct, data-driven
- Admin: technical, business info
         ↓
streamText({
  model: gpt-4-turbo,
  system: adaptedPrompt,
  messages,
  tools: [calculateProfit, checkDeadlines, suggestCategory]
})
         ↓
Streaming response back to client
         ↓
Client muestra respuesta palabra por palabra
```

---

## 📊 Matriz de Contextos Simplificada

```
┌─────────────────┬──────────┬──────────────┬──────────────────┐
│ PAGE            │ ROLE     │ GREETING     │ SUGGESTIONS      │
├─────────────────┼──────────┼──────────────┼──────────────────┤
│ Landing         │ visitor  │ "Hola, soy   │ VeriFactu?,      │
│                 │          │ tu experto"  │ IVA?, Datos?     │
├─────────────────┼──────────┼──────────────┼──────────────────┤
│ Dashboard       │ user     │ "Hola de     │ Beneficio,       │
│                 │          │ nuevo"       │ Gasto, Facturas  │
├─────────────────┼──────────┼──────────────┼──────────────────┤
│ Admin           │ admin    │ "Bienvenido  │ Empresas,        │
│                 │          │ admin"       │ Reportes, Import │
└─────────────────┴──────────┴──────────────┴──────────────────┘
```

---

## 🌍 Flujo de Idioma

```
Usuario accede desde navegador
         ↓
navigator.language = "es-ES" | "en-US" | "pt-BR" | "fr-FR" | etc.
         ↓
useIsaakDetection():
  const browserLang = navigator.language.split("-")[0]  // "es"
  const language = ["es", "en", "pt", "fr"].includes(browserLang)
    ? browserLang
    : "es"  // fallback español
         ↓
Guarda en detection.language
         ↓
useProactiveMessages():
  getProactiveMessages(language, context, role)
  → PROACTIVE_MESSAGES_I18N[es][dashboard][user]
         ↓
IsaakSmartFloating:
  getIsaakFloatingContext(language, context, role)
  → ISAAK_FLOATING_CONTEXTS_I18N[es][dashboard:user]
         ↓
Usuario ve todo en su idioma automáticamente ✨
```

---

## 🎨 Renderización de Burbujas

```
IsaakProactiveBubbles monta
         ↓
useProactiveMessages() → [msg1, msg2, msg3, ...]
         ↓
Para cada mensaje:
  setTimeout(() => {
    setActiveMessages(prev => [...prev, msgId])
  }, msg.delay)
         ↓
Cuando activeMessages.includes(msgId):
  <AnimatePresence>
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}  ← Aparece
      exit={{opacity: 0, y: -20}}
    >
      [Contenido burbuja]
    </motion.div>
  </AnimatePresence>
         ↓
Usuario ve burbuja animada
         ↓
Al clickear ✕:
  dismissed.add(msgId)
  activeMessages.delete(msgId)  ← Se oculta
```

---

## 🔗 Conexión Componentes

```
layout.tsx (Dashboard)
├─ IsaakDrawer (antiguo)
├─ IsaakSmartFloating (nuevo)
│  └─ useIsaakDetection
│  └─ getIsaakFloatingContext
│     └─ POST /api/chat {context}
│
└─ IsaakProactiveBubbles (nuevo)
   └─ useProactiveMessages
      └─ useIsaakDetection
         └─ getProactiveMessages
            └─ PROACTIVE_MESSAGES_I18N

libs/
├─ isaak-messages-i18n.ts
│  └─ PROACTIVE_MESSAGES_I18N (4 idiomas)
│
└─ isaak-floating-contexts-i18n.ts
   └─ ISAAK_FLOATING_CONTEXTS_I18N (4 idiomas)
```

---

## 📱 Responsive Behavior

```
Desktop (≥1024px)
├─ Burbujas: bottom-24 right-6, max-w-sm
├─ Chat: 384x384px (w-96, max-h-96)
└─ Botón: 56x56px (h-14 w-14)

Tablet (768px-1024px)
├─ Burbujas: same
├─ Chat: max-w-96 (responsive)
└─ Botón: same

Mobile (< 768px)
├─ Burbujas: bottom-20 right-4, max-w-[calc(100vw-2rem)]
├─ Chat: max-w-[calc(100vw-2rem)], full width nearly
└─ Botón: same size, better reach
```

---

## ⚡ Optimizaciones

1. **Lazy Loading:** Suspense en layout
2. **Memoization:** useCallback para handlers
3. **Code Splitting:** Componentes lazy si es necesario
4. **Streaming:** API/chat streaming response
5. **Caching:** System prompts pre-calculated
6. **Edge Runtime:** /api/chat en edge (opcional)

---

## 🔐 Seguridad

```
Landing (sin auth)
└─ POST /api/chat OK
   └─ No requiere tenant

Dashboard (con auth)
└─ POST /api/chat
   ├─ Verifica sesión
   ├─ Obtiene tenant de cookie
   ├─ Limita datos al tenant
   └─ No expone otros tenants

Admin (con auth + admin_emails)
└─ POST /api/chat
   ├─ Verifica admin role
   ├─ Permite datos consolidados
   └─ Logs sin PII
```

---

**Arquitectura modular, escalable y segura.** ✅
