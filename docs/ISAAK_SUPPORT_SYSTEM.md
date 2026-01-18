# 🤖 Sistema de Auto-Respuesta Isaak

Sistema inteligente de soporte por email usando IA para responder automáticamente o escalar a humano.

---

## 🎯 Objetivo

**Isaak** recibe emails en `soporte@verifactu.business`, los analiza con GPT-4 y:
1. **Responde automáticamente** si puede resolver la duda
2. **Escala a humano** (`kiabusiness2025@gmail.com`) si requiere intervención

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Email Entrante                            │
│              soporte@verifactu.business                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Resend Webhook                              │
│         POST /api/webhooks/resend/inbound                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              1. Filtro Anti-Spam                             │
│    Keywords: viagra, lottery, casino, etc.                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         2. Clasificación con Isaak (GPT-4)                   │
│                                                               │
│  Analiza:                                                     │
│  - Categoría (technical, billing, feature, bug, etc.)        │
│  - Prioridad (low, medium, high, critical)                   │
│  - ¿Necesita humano? (true/false)                            │
│  - Sugerencia de respuesta                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
┌──────────────────┐  ┌──────────────────────┐
│ 3a. Auto-Responde│  │ 3b. Escala a Humano  │
│                  │  │                      │
│ Isaak envía      │  │ Notifica admin:      │
│ respuesta útil   │  │ kiabusiness2025@     │
│ al usuario       │  │ gmail.com            │
│                  │  │                      │
│ + Log al admin   │  │ + ACK al usuario     │
└──────────────────┘  └──────────────────────┘
```

---

## 📋 Implementación

### Archivo Principal

[apps/app/app/api/webhooks/resend/inbound/route.ts](../apps/app/app/api/webhooks/resend/inbound/route.ts)

**Funciones clave**:

1. **`classifyEmailWithIsaak()`**: Analiza email con GPT-4
2. **`sendIsaakResponse()`**: Envía respuesta automática
3. **`notifyAdmin()`**: Escala a `kiabusiness2025@gmail.com`
4. **`isLikelySpam()`**: Filtro básico de spam

---

## 🔧 Configuración

### 1. Webhook en Resend

Dashboard → Webhooks → Add Webhook

```
URL: https://verifactu.business/api/webhooks/resend/inbound
Events: ✅ email.received
Domain: verifactu.business
Status: Active
```

Copiar **Webhook Secret** para validar firmas.

### 2. Variables de Entorno

```bash
# .env.local (apps/app)
RESEND_API_KEY=re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA
RESEND_WEBHOOK_SECRET=whsec_xxx

# OpenAI para Isaak
OPENAI_API_KEY=sk-xxx
ISAAK_SUPPORT_ENABLED=true

# Admin
ADMIN_NOTIFICATION_EMAIL=kiabusiness2025@gmail.com
ADMIN_EMAILS=kiabusiness2025@gmail.com,soporte@verifactu.business
```

### 3. Configurar en Vercel

Vercel Dashboard → Settings → Environment Variables

Añadir todas las variables anteriores.

---

## 📝 Matriz de Decisión

| Situación | Auto-Responde | Escala | Prioridad |
|-----------|---------------|--------|-----------|
| "¿Cómo crear factura?" | ✅ Tutorial paso a paso | ❌ | Low |
| "¿Qué es VeriFactu?" | ✅ Explicación normativa | ❌ | Low |
| "Olvidé mi contraseña" | ✅ Link de reset | ❌ | Medium |
| "¿Cuánto cuesta el plan Pro?" | ✅ Info de precios | ❌ | Low |
| "No puedo acceder" | ⚠️ ACK genérico | ✅ | High |
| "Error al generar factura" | ⚠️ Pide detalles | ✅ | Medium |
| "Quiero reembolso" | ❌ | ✅ | High |
| "Mensaje urgente" | ❌ | ✅ | Critical |
| Spam detectado | 🚫 Filtrado | ❌ | - |

---

## 📧 Ejemplo de Flujo Completo

### Caso 1: Pregunta Simple

**Email entrante**:
```
De: juan@empresa.com
Asunto: ¿Cómo funciona VeriFactu?
Cuerpo: Hola, soy nuevo y no entiendo qué es VeriFactu.
```

**Isaak analiza**:
```json
{
  "category": "general",
  "confidence": 0.95,
  "needsHuman": false,
  "priority": "low",
  "suggestedResponse": "VeriFactu es una normativa española..."
}
```

**Isaak responde automáticamente**:
```
Para: juan@empresa.com
Asunto: Re: ¿Cómo funciona VeriFactu?

Hola,

VeriFactu es una normativa de la Agencia Tributaria española...
[respuesta completa con tutoriales]

Si necesitas más ayuda, responde a este email.

Saludos,
Isaak - Verifactu Business
```

**Log al admin** (no urgente):
```
Console: [✅ SENT] Auto-respuesta enviada a juan@empresa.com
```

---

### Caso 2: Problema Urgente

**Email entrante**:
```
De: maria@tienda.com
Asunto: URGENTE - No puedo generar facturas
Cuerpo: Llevo 2 horas intentando generar facturas y 
me sale error. Necesito enviarlas YA a mis clientes.
```

**Isaak analiza**:
```json
{
  "category": "bug_report",
  "confidence": 0.88,
  "needsHuman": true,
  "priority": "critical",
  "suggestedResponse": null
}
```

**Isaak NO responde, escala**:

1. **ACK al usuario**:
```
Para: maria@tienda.com
Asunto: Re: URGENTE - No puedo generar facturas

Hola María,

Hemos recibido tu mensaje URGENTE. Nuestro equipo 
técnico lo está revisando ahora.

Tiempo de respuesta: Menos de 2 horas

Te contactaremos pronto.
Equipo Verifactu
```

2. **Notificación al admin**:
```
Para: kiabusiness2025@gmail.com
Asunto: [CRITICAL] Email de Soporte: URGENTE - No puedo generar facturas

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Email Requiere Atención INMEDIATA
━━━━━━━━━━━━━━━━━━━━━━━━━━

De: maria@tienda.com
Categoría: bug_report
Prioridad: CRITICAL
Confianza: 88%

Mensaje:
─────────────────────────────
Llevo 2 horas intentando generar facturas y 
me sale error. Necesito enviarlas YA a mis clientes.
─────────────────────────────

[Responder Ahora] ← Gmail abre con reply pre-poblado
```

---

## 🎯 Prompt de Isaak (GPT-4)

```
Eres Isaak, asistente de soporte de Verifactu Business 
(SaaS de contabilidad y facturación española con VeriFactu).

RESPONDE AUTOMÁTICAMENTE si:
- Pregunta sobre cómo usar la plataforma
- Duda sobre VeriFactu (normativa española)
- Recuperación de contraseña
- Consulta de precios/planes
- Preguntas frecuentes

ESCALA A HUMANO si:
- Problema técnico complejo o bug
- Solicitud de reembolso
- Queja seria o tono frustrado
- Datos sensibles involucrados
- Tono urgente
- No estás seguro de la respuesta

TU RESPUESTA DEBE:
- Ser profesional y útil
- Incluir pasos concretos si es tutorial
- Ofrecer ayuda adicional
- Ser concisa (máx. 300 palabras)
- Usar tono amable y cercano

Responde SOLO con JSON:
{
  "category": "technical|billing|feature_request|bug_report|general|urgent|spam",
  "confidence": 0.0-1.0,
  "needsHuman": true/false,
  "priority": "low|medium|high|critical",
  "suggestedResponse": "tu respuesta aquí o null"
}
```

---

## 🧪 Testing

### Test Local

```bash
# Terminal 1: Run dev server
cd apps/app
pnpm dev

# Terminal 2: Send test webhook
curl -X POST http://localhost:3000/api/webhooks/resend/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@ejemplo.com",
    "to": "soporte@verifactu.business",
    "subject": "¿Cómo funciona VeriFactu?",
    "text": "Necesito ayuda para entender la normativa",
    "html": "<p>Necesito ayuda para entender la normativa</p>",
    "headers": {}
  }'
```

### Test en Producción

Enviar email real a `soporte@verifactu.business` y verificar:

1. ✅ Webhook recibe el email
2. ✅ Isaak clasifica correctamente
3. ✅ Respuesta automática o escalamiento funciona
4. ✅ Admin recibe notificación si aplica

---

## 📊 Métricas Sugeridas

Implementar dashboard en `/dashboard/admin/support`:

- **Total emails recibidos** (hoy/semana/mes)
- **Auto-respuestas exitosas** (%)
- **Escalados a humano** (%)
- **Spam filtrado** (%)
- **Tiempo promedio de respuesta**
- **Categorías más comunes**
- **Satisfacción del usuario** (si se implementa)

---

## 🔮 Mejoras Futuras

- [ ] **Vector DB**: Almacenar respuestas previas para RAG
- [ ] **Fine-tuning**: Entrenar modelo con conversaciones reales
- [ ] **Multi-idioma**: Detectar idioma y responder apropiadamente
- [ ] **Sentiment Analysis**: Detectar frustración/urgencia
- [ ] **Auto-ticket**: Crear tickets en sistema interno
- [ ] **Knowledge Base**: Integrar con documentación oficial
- [ ] **Chat en vivo**: Escalar a chat si el usuario lo solicita
- [ ] **Analytics**: Dashboard de métricas en tiempo real

---

## 🆘 Troubleshooting

### Webhook no recibe emails

1. ✅ Verificar URL en Resend Dashboard
2. ✅ Confirmar que el dominio está verificado
3. ✅ Revisar logs en Vercel Functions
4. ✅ Testear endpoint manualmente con curl

### Isaak no responde bien

1. ✅ Ajustar prompt del sistema
2. ✅ Aumentar `temperature` para más creatividad
3. ✅ Reducir `temperature` para más consistencia
4. ✅ Añadir ejemplos en el prompt (few-shot)

### Admin no recibe notificaciones

1. ✅ Verificar `ADMIN_NOTIFICATION_EMAIL` configurado
2. ✅ Revisar logs de Resend API
3. ✅ Comprobar que no va a spam
4. ✅ Testear con email de prueba

---

## 📚 Referencias

- [Resend Webhooks](https://resend.com/docs/webhooks)
- [OpenAI GPT-4](https://platform.openai.com/docs)
- [Email Best Practices](https://www.emailonacid.com/blog/)
