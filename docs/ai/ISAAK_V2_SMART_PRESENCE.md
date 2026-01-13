# ISAAK V2.0 - Presencia Contextual & Proactiva

## 🎯 Objetivo

Mejorar significativamente la presencia y "experiencia" de Isaak detectando automáticamente:
- **Dónde está el usuario** (landing, dashboard usuario, admin)
- **Quién es el usuario** (visitante, usuario, admin)
- **Qué idioma prefiere** (navegador del sistema)
- **Ofrecer ayuda proactiva y contextual** sin esperar a que el usuario pregunte

---

## ✨ Mejoras Implementadas

### 1. **Detección Automática de Contexto** (`useIsaakDetection`)

```typescript
// Hook que detecta automáticamente:
- Página actual (landing, dashboard, admin)
- Rol del usuario (visitor, user, admin)
- Idioma del navegador
- Empresa seleccionada (si aplica)
```

**Ubicación:** `apps/app/hooks/useIsaakDetection.ts`

**Usa:** `usePathname()` para detectar página actual

**Retorna:**
```typescript
{
  context: "landing" | "dashboard" | "admin",
  role: "visitor" | "user" | "admin",
  language: "es" | "en" | "pt" | "fr",
  path: string,
  company?: string
}
```

---

### 2. **Mensajes Proactivos Contextualizados** (`useProactiveMessages`)

Hook que devuelve mensajes personalizados según contexto:

#### Landing (Visitantes)
```
👋 "Bienvenido a Verifactu"
"Soy Isaak, tu asistente fiscal. Puedo ayudarte..."

💡 "¿Confundido con IVA?"
"He ayudado a miles de autónomos..."
```

#### Dashboard (Usuarios normales)
```
📊 "Tu resumen hoy"
"Haz clic para ver tu beneficio del mes"

⏰ "Recordatorio VeriFactu"
"¿Has subido tus facturas de hoy?"

💡 "Gastos inteligentes"
"Sube receipts y yo los clasifico automáticamente"
```

#### Admin Panel
```
🔐 "Panel de Control"
"Hola admin. Tengo 5 empresas activas..."

📥 "Importación rápida"
"¿Necesitas añadir empresas? Puedo importar CSV..."

📈 "Reportes listos"
"Genera modelos 303, 390 o balance general"
```

**Ubicación:** `apps/app/hooks/useProactiveMessages.ts`

---

### 3. **Burbujas de Chat Emergentes** (`IsaakProactiveBubbles`)

Componente que muestra mensajes contextuales **automáticamente**:

- ✅ Aparecen después de un delay específico
- ✅ Se descartan al hacer click ✕
- ✅ Animaciones suaves (Framer Motion)
- ✅ Iconos contextuales (💡, ⚠️, ✓, ℹ️)
- ✅ Colores según tipo (tip, warning, success, info)
- ✅ Posicionadas encima del chat flotante

**Ubicación:** `apps/app/components/isaak/IsaakProactiveBubbles.tsx`

**Flujo:**
1. Hook `useProactiveMessages()` detecta contexto
2. Cada mensaje aparece con delay específico
3. Usuario ve "nubes" emergentes a lo largo de la sesión
4. Al descartar, el sistema recuerda que lo vio

---

### 4. **Chat Flotante Inteligente** (`IsaakSmartFloating`)

Reemplazo mejorado del IsaakDrawer con:

#### Botón Flotante
- Posición: fixed bottom-6 right-6
- Gradiente azul moderno
- Animación al hover
- Responde al contexto

#### Ventana de Chat Contextual
- **Saludo personalizado** según dónde esté el usuario
- **Sugerencias contextuales** (no genéricas)
- **Streaming de mensajes** en tiempo real
- **Indicador de "escribiendo..."** animado

**Ejemplos:**

**Landing:**
```
Hola 👋 Soy Isaak, tu experto en fiscalidad
[¿Qué es VeriFactu?] [¿Cómo funciona el IVA?] [¿Qué datos necesito?]
```

**Dashboard Usuario:**
```
Hola de nuevo 👋 ¿Qué necesitas?
[Mi beneficio hoy] [Subir gasto] [Ver facturas pendientes]
```

**Admin:**
```
Bienvenido al panel admin 🔐
[Estado de empresas] [Generar reportes] [Importar datos]
```

**Ubicación:** `apps/app/components/isaak/IsaakSmartFloating.tsx`

---

### 5. **Prompts Contextuales en API** (`/api/chat`)

El endpoint ahora recibe el contexto del cliente:

```typescript
POST /api/chat
{
  messages: [...],
  context: {
    type: "landing" | "dashboard" | "admin",
    role: "visitor" | "user" | "admin",
    language: "es" | "en" | ...,
    company?: string
  }
}
```

El system prompt se adapta:

#### Landing:
```
Tu contexto: El usuario está visitando nuestra landing page.
- Sé breve y cautivador
- Menciona el valor principal
- Invita a probar o conocer más
```

#### Dashboard:
```
Tu contexto: El usuario está en su panel de control.
- Ayuda con preguntas específicas sobre facturas y gastos
- Sé práctico: "Tu beneficio este mes es X"
- Sugiere acciones concretas
```

#### Admin:
```
Tu contexto: El usuario es un administrador.
- Proporciona información técnica y operativa
- Ayuda con reportes e importación
- Ofrece análisis de negocio
```

---

## 🔧 Instalación & Integración

### 1. Los componentes se incluyen automáticamente en el layout:

**apps/app/app/dashboard/layout.tsx**
```tsx
<Suspense fallback={null}>
  <IsaakSmartFloating />
  <IsaakProactiveBubbles />
</Suspense>
```

### 2. También en la landing (si aplica):

**apps/landing/app/layout.tsx**
```tsx
<IsaakSmartFloating />
```

---

## 📊 Comportamiento Esperado

### Timeline de una sesión típica:

**Usuario entra al dashboard:**
1. **2s**: Aparece burbuja "Tu resumen hoy" (info)
2. **10s**: Aparece burbuja "Recordatorio VeriFactu" (tip)
3. **15s**: Aparece burbuja "Gastos inteligentes" (success)
4. **Siempre visible**: Botón flotante azul en bottom-right

**Usuario abre chat:**
- Saludo personalizado: "Hola de nuevo 👋 ¿Qué necesitas?"
- 3 sugerencias contextuales
- Conversación fluida con Isaak

---

## 🌍 Detección de Idioma

El sistema detecta automáticamente el idioma del navegador:

```typescript
const browserLang = navigator.language.split("-")[0]; // "es", "en", "pt", etc.
const language = ["es", "en", "pt", "fr"].includes(browserLang)
  ? browserLang
  : "es"; // Fallback a español
```

**Próximo paso:** Adaptar los mensajes a cada idioma.

---

## 🎨 Experiencia Visual

### Burbujas Proactivas
- **Animación entrada:** opacity 0→1, y: 20→0, scale 0.95→1 (0.3s)
- **Colores:**
  - Tip (💡): amber-50 / amber-200
  - Warning (⚠️): red-50 / red-200
  - Success (✓): green-50 / green-200
  - Info (ℹ️): blue-50 / blue-200

### Chat Flotante
- **Botón:** Gradiente blue-600→blue-500, shadow-lg
- **Ventana:** rounded-2xl, shadow-2xl, max-h-96
- **Header:** Gradiente azul with "Isaak" + "Tu asistente fiscal"
- **Input:** Moderna con foco azul

---

## 📝 Casos de Uso

### Para Visitantes (Landing)
✅ Presentar Isaak como experto
✅ Responder preguntas sobre VeriFactu
✅ Reducir fricción inicial
✅ Convertir visitante → usuario

### Para Usuarios
✅ Recordar tareas (VeriFactu, gastos)
✅ Ofrecer ayuda proactiva
✅ Sugerir acciones (subir gasto, ver beneficio)
✅ Asistencia contextual

### Para Admins
✅ Resumen rápido del estado
✅ Acceso a reportes
✅ Importación de datos
✅ Análisis consolidado

---

## 🚀 Próximos Pasos

1. **Adaptar mensajes a otros idiomas** (en, pt, fr)
2. **Historial de mensajes persistente** (localStorage/DB)
3. **Preferencias de usuario** (desactivar burbujas)
4. **Análisis de comportamiento** (qué mensajes funcionan)
5. **Modo de voz** (Web Speech API)
6. **Integración con notificaciones** (push si hay deadlines)

---

## 📦 Archivos Creados/Modificados

### Nuevos:
- ✅ `apps/app/hooks/useIsaakDetection.ts` - Detección contextual
- ✅ `apps/app/hooks/useProactiveMessages.ts` - Mensajes contextuales
- ✅ `apps/app/components/isaak/IsaakProactiveBubbles.tsx` - Burbujas emergentes
- ✅ `apps/app/components/isaak/IsaakSmartFloating.tsx` - Chat inteligente

### Modificados:
- ✅ `apps/app/app/api/chat/route.ts` - Soporte de contexto
- ✅ `apps/app/app/dashboard/layout.tsx` - Incluir nuevos componentes

---

## 🎯 Resumen de Valor

| Aspecto | Antes | Después |
|--------|-------|---------|
| Presencia de Isaak | Pasiva (solo si abre chat) | Proactiva (aparece automáticamente) |
| Mensajes | Genéricos ("¿Qué necesitas?") | Contextual según página |
| Ubicación | Chat lateral fijo | Botón flotante + burbujas |
| Detección idioma | No | Sí (automático) |
| Rol del usuario | No considerado | Adaptado por rol |
| UX | Básica | Sofisticada y moderna |

**Resultado:** Isaak ahora es un **asistente verdaderamente inteligente y presente** que se adapta a cada usuario y momento. 🚀
