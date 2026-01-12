# Integración de IA de Vercel en Isaak

## 🎯 Resumen

Isaak ahora usa el **SDK de IA de Vercel** para proporcionar respuestas inteligentes con streaming en tiempo real y herramientas especializadas en contabilidad.

---

## ✅ Lo que se ha implementado

### 1. **Endpoint `/api/chat`** (Edge Runtime)
- **Ubicación:** `apps/app/app/api/chat/route.ts`
- **Modelo:** GPT-4 Turbo de OpenAI
- **Características:**
  - ✅ Streaming de respuestas (texto aparece en tiempo real)
  - ✅ System prompt personalizado para Isaak
  - ✅ 3 herramientas especializadas

### 2. **Herramientas de IA (Tools)**

#### a) `calculateProfit`
Calcula beneficio automáticamente:
```
Usuario: "Si vendí 10000€ y gasté 3500€, ¿cuánto gané?"
Isaak: En este periodo: has facturado 10000€, gastado 3500€. 
       Tu beneficio es 6500€ (margen del 65%)
```

#### b) `checkVeriFactuDeadlines`
Consulta plazos VeriFactu:
```
Usuario: "¿Cuándo tengo que enviar las facturas de enero?"
Isaak: Para las facturas de enero/2026, debes enviarlas 
       a la AEAT antes del 15/2/2026. Yo te aviso antes.
```

#### c) `suggestExpenseCategory`
Clasifica gastos automáticamente:
```
Usuario: "¿En qué categoría pongo 'Licencia Adobe 59€'?"
Isaak: "Licencia Adobe 59€" → Categoría sugerida: 
       Software y herramientas | 59€
```

### 3. **Componente IsaakDrawer actualizado**
- **Ubicación:** `apps/app/components/isaak/IsaakDrawer.tsx`
- **Cambios:**
  - ✅ Hook `useChat` de Vercel AI SDK
  - ✅ Streaming de mensajes en tiempo real
  - ✅ Indicador de "escribiendo..." animado
  - ✅ Chips interactivos (suggestions)
  - ✅ Auto-scroll a últimos mensajes
  - ✅ Disabled states durante loading

---

## 📦 Dependencias instaladas

```bash
npm install ai @ai-sdk/openai zod
```

- **ai**: SDK principal de Vercel para IA
- **@ai-sdk/openai**: Integración con OpenAI
- **zod**: Validación de schemas para herramientas

---

## 🔐 Variables de entorno

### Local (`.env.local`)
```env
OPENAI_API_KEY=sk-proj-xxxxx
```

### Vercel (ya configurada)
```
OPENAI_API_KEY → Production ✅
```

---

## 🚀 Próximos pasos sugeridos

### 1. **Conectar con base de datos real**
Las herramientas ahora devuelven datos mock. Conéctalas a:
- `calculateProfit` → Query a tabla `invoices` y `expenses`
- `checkVeriFactuDeadlines` → Query a `invoices` para ver pendientes
- `suggestExpenseCategory` → Insertar en `expenses` con categoría sugerida

### 2. **Añadir más herramientas**
```typescript
// Ejemplo: Crear factura desde chat
createInvoice: tool({
  description: 'Crea una factura nueva',
  parameters: z.object({
    customer: z.string(),
    amount: z.number(),
    description: z.string(),
  }),
  execute: async ({ customer, amount, description }) => {
    // INSERT INTO invoices...
    return { invoiceNumber: 'F-2026-001', message: 'Factura creada' };
  },
}),
```

### 3. **Historial de conversación**
Guardar mensajes en localStorage o base de datos para persistencia:
```typescript
useEffect(() => {
  if (messages.length > 0) {
    localStorage.setItem('isaak-history', JSON.stringify(messages));
  }
}, [messages]);
```

### 4. **Modo de voz**
Integrar Web Speech API para que Isaak "hable":
```typescript
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance(isaakMessage);
utterance.lang = 'es-ES';
synth.speak(utterance);
```

---

## 🔧 Testing local

1. Asegúrate de tener `OPENAI_API_KEY` en `.env.local`
2. Ejecuta el dev server:
   ```bash
   npm run dev
   ```
3. Abre el drawer de Isaak
4. Prueba:
   - "Si vendí 5000€ y gasté 2000€, ¿cuánto gané?"
   - "¿Cuándo vencen las facturas de enero?"
   - "¿Dónde pongo el gasto de 'Hosting Vercel 20€'?"

---

## 📚 Recursos

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [OpenAI Models](https://platform.openai.com/docs/models)
- [Tool Calling Guide](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- [Streaming Responses](https://sdk.vercel.ai/docs/ai-sdk-ui/streaming-data)

---

## ✨ Mejoras de UX implementadas

- **Streaming:** El texto aparece palabra por palabra (más natural)
- **Loading state:** 3 puntos animados mientras Isaak piensa
- **Chips interactivos:** Clic en sugerencia → auto-completa input
- **Scroll automático:** Siempre ves el último mensaje
- **Disabled states:** No puedes enviar mientras procesa

---

**Estado:** ✅ Listo para deploy
**Próximo paso:** Conectar herramientas con base de datos real
