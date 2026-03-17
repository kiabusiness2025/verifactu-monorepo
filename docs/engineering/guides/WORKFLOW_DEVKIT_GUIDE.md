# Workflow DevKit - Guía de Implementación

## Descripción General

Verifactu ahora utiliza **Workflow DevKit** para hacer funciones TypeScript duraderas, confiables y observables. Esto permite:

- ✅ **Durabilidad**: Los flujos se pausan y reanudan sin perder estado
- ✅ **Reintentos automáticos**: Fallos se reintentan automáticamente
- ✅ **Observabilidad**: Monitorea cada paso de cada ejecución
- ✅ **Sin consumo de recursos**: Las pausas no consumen servidores

---

## Workflows Implementados

### 1. **User Onboarding Workflow**
**Archivo**: `app/workflows/user-onboarding.ts`

Ejecuta automáticamente cuando un usuario se registra:

```typescript
1. → Envía email de bienvenida inmediatamente
2. → Pausa 7 días (sin consumir recursos)
3. → Envía email de seguimiento
```

**Triggeador**: API route `POST /api/workflows/user-onboarding`

**Ejemplo**:
```bash
curl -X POST http://localhost:3000/api/workflows/user-onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -d '{
    "userId": "user-123",
    "email": "cliente@example.com",
    "userName": "Juan Pérez"
  }'
```

---

### 2. **Email Processing Workflow**
**Archivo**: `app/workflows/user-onboarding.ts`

Procesa emails entrantes con durabilidad:

```typescript
1. → Registra el email en la base de datos
2. → Envía auto-respuesta al remitente
3. → Notifica al admin
```

**Uso interno**: Se dispara automáticamente cuando llega un email vía webhook

---

### 3. **Support Ticket Workflow**
**Archivo**: `app/workflows/support-tickets.ts`

Gestiona tickets de soporte con escaladas automáticas:

```typescript
1. → Envía respuesta automática inmediata
2. → Pausa 24 horas
3. → Si es prioritario, escala al supervisor
4. → Pausa 7 días adicionales
5. → Envía email de cierre por inactividad
```

**Triggeador**: API route `POST /api/workflows/support-ticket`

**Ejemplo**:
```bash
curl -X POST http://localhost:3000/api/workflows/support-ticket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -d '{
    "ticketId": "ticket-456",
    "from": "cliente@example.com",
    "subject": "Problema con facturación",
    "body": "No puedo emitir facturas desde el dashboard",
    "priority": "high"
  }'
```

---

## Directivas de Workflow

### "use workflow"
Marca una función como **flujo de trabajo duradero**:

```typescript
export async function userOnboardingWorkflow(data: UserSignupData) {
  "use workflow";
  
  // El código aquí es reanudable y duradero
  await sendWelcomeEmail(data.email);
  await sleep('7 days');
  await sendFollowUpEmail(data.email);
}
```

### "use step"
Marca una función como **paso atómico** dentro de un workflow:

```typescript
export async function sendWelcomeEmail(email: string) {
  "use step";
  
  // Se ejecuta con reintentos automáticos
  return await resend.emails.send({...});
}
```

### Pausas Duraderas
```typescript
import { sleep } from 'workflow';

// Pausa sin consumir recursos del servidor
await sleep('7 days');
await sleep('24 hours');
await sleep('30 seconds');
```

---

## Estructura de Archivos

```
app/workflows/
├── index.ts                 # Exporta todos los workflows
├── email-steps.ts          # Steps reutilizables para emails
├── user-onboarding.ts      # Workflow de onboarding
└── support-tickets.ts      # Workflow de tickets

app/api/workflows/
├── user-onboarding/
│   └── route.ts            # API para disparar onboarding
└── support-ticket/
    └── route.ts            # API para disparar ticket workflow
```

---

## Configuración de Next.js

El `next.config.mjs` está configurado con `withWorkflow()`:

```typescript
import { withWorkflow } from 'workflow/next';

const nextConfig = {
  // ...config...
};

export default withWorkflow(nextConfig);
```

Esto activa:
- ✅ Directivas `"use workflow"` y `"use step"`
- ✅ Compilación optimizada de workflows
- ✅ Integración con Vercel/Workflow backend

---

## Manejo de Errores

### FatalError
Para errores que NO deben reintentar:

```typescript
import { FatalError } from 'workflow';

export async function sendEmail(email: string) {
  "use step";
  
  const resp = await resend.emails.send({...});
  
  if (resp.error) {
    // Este error NO se reintentará automáticamente
    throw new FatalError(resp.error.message);
  }
}
```

### Errores Normales
Se reintentan automáticamente:

```typescript
export async function processData(data: any) {
  "use step";
  
  // Este error se reintentará automáticamente
  throw new Error('Temporary database connection error');
}
```

---

## Ejemplo Completo: Onboarding

**1. Usuario se registra** (en `/api/auth/signup`)

```typescript
// Disparar workflow
const response = await fetch('/api/workflows/user-onboarding', {
  method: 'POST',
  body: JSON.stringify({
    userId: newUser.id,
    email: newUser.email,
    userName: newUser.name,
  }),
});
```

**2. Workflow se ejecuta automáticamente**:
- ✅ T+0s: Email de bienvenida enviado
- ⏸️ T+7d: Pausa
- ✅ T+7d: Email de seguimiento enviado

**3. Monitorea el progreso** en el dashboard de Workflow (cuando esté disponible)

---

## Testing Local

En desarrollo local (`localhost:3000`), los workflows:
- Se ejecutan sin la pausa real (instantáneamente)
- Puedes ver logs en la consola del servidor
- Los `sleep()` se respetan en el ciclo de ejecución

---

## Próximos Pasos

1. ✅ Integrar workflows en el sistema de autenticación (register)
2. ✅ Conectar webhook de Resend para disparar `emailProcessingWorkflow`
3. ⏳ Integrar dashboard de Workflow para observabilidad
4. ⏳ Crear más workflows para casos de uso específicos (pagos, reportes, etc.)

---

## Recursos

- 📚 [Workflow DevKit Docs](https://workflow.dev)
- 🎯 [Next.js Integration](https://workflow.dev/docs/next)
- 🚀 [Deploy to Vercel](https://vercel.com/docs/workflow)
