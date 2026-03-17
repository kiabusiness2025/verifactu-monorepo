# 📧 Sistema de Emails Real - Configuración

## ✅ Implementado

El sistema de emails para `soporte@verifactu.business` está completamente implementado y listo para recibir correos reales.

---

## 🏗️ Arquitectura

```
┌─────────────────────┐
│  Usuario externo    │
│  envía email a      │
│  soporte@...        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Resend recibe      │
│  y procesa email    │
└──────────┬──────────┘
           │
           │ webhook POST
           ▼
┌─────────────────────┐
│  /api/webhooks/     │
│  resend             │
│  - Detecta spam     │
│  - Detecta prioridad│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  PostgreSQL         │
│  tabla:             │
│  admin_emails       │
└──────────┬──────────┘
           │
           │ query
           ▼
┌─────────────────────┐
│  Panel Admin        │
│  /dashboard/admin/  │
│  emails             │
└─────────────────────┘
```

---

## 📋 Paso a paso: Configuración

### 1. ✅ Base de Datos (Completado)

**Archivo:** `db/migrations/003_create_emails_table.sql`

La migración crea:
- Tabla `admin_emails` con todos los campos necesarios
- Índices optimizados para búsquedas rápidas
- Triggers para `updated_at` automático
- Soporte para prioridad, status, tags

**Ejecutar migración:**

```bash
# Conectar a tu PostgreSQL
psql -U usuario -d verifactu_app -f db/migrations/003_create_emails_table.sql

# O usando un script de migración
pnpm run db:migrate
```

---

### 2. ✅ Webhook Endpoint (Completado)

**Archivo:** `apps/app/app/api/webhooks/resend/route.ts`

**Funcionalidades:**
- ✅ Recibe payload de Resend
- ✅ Detecta prioridad automáticamente (keywords: urgente, importante, error, etc.)
- ✅ Detecta spam (dominios sospechosos, keywords spam)
- ✅ Guarda en PostgreSQL
- ✅ Logging completo
- ✅ Verificación de webhook secret

**Endpoint:** `POST https://app.verifactu.business/api/webhooks/resend`

---

### 3. ✅ API de Admin (Completado)

**Archivo:** `apps/app/app/api/admin/emails/route.ts`

**Endpoints:**

#### `GET /api/admin/emails`
Obtiene emails con filtros y paginación.

**Query params:**
- `status`: `all` | `pending` | `responded` | `archived` | `spam`
- `priority`: `all` | `low` | `normal` | `high`
- `limit`: número de resultados (default: 50)
- `offset`: offset para paginación (default: 0)

**Respuesta:**
```json
{
  "emails": [...],
  "total": 123,
  "pending": 45,
  "responded": 67,
  "archived": 10,
  "spam": 1,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### `PATCH /api/admin/emails`
Actualiza estado de un email.

**Body:**
```json
{
  "emailId": "uuid",
  "status": "responded",
  "respondedBy": "user-id" // opcional
}
```

---

### 4. ⚙️ Configurar Resend (PENDIENTE)

#### 4.1 Configurar dominio de recepción

1. **Ir a Resend Dashboard:**
   - https://resend.com/domains

2. **Configurar dominio `verifactu.business`:**
   - Verificar que está validado
   - Configurar registros MX para recepción de emails:
     ```
     Tipo: MX
     Host: @
     Valor: in.resend.com
     Prioridad: 10
     ```

3. **Esperar propagación DNS** (puede tardar 24-48h)

#### 4.2 Crear webhook

1. **Ir a Webhooks:**
   - https://resend.com/webhooks

2. **Crear nuevo webhook:**
   - **URL:** `https://app.verifactu.business/api/webhooks/resend`
   - **Eventos:** Seleccionar `email.received`
   - **Descripción:** "Recepción de emails en soporte@verifactu.business"

3. **Copiar Webhook Secret**
   - Se mostrará al crear el webhook
   - Ejemplo: `whsec_abc123xyz...`

4. **Añadir a `.env.local`:**
   ```bash
   # Webhook de Resend
   RESEND_WEBHOOK_SECRET=whsec_abc123xyz...
   ```

5. **Desplegar a producción:**
   ```bash
   vercel --prod
   ```

#### 4.3 Probar webhook

**Enviar email de prueba:**
```bash
# Desde tu email personal, envía a:
soporte@verifactu.business

# Asunto: Test de webhook
# Contenido: Hola, esto es una prueba
```

**Verificar logs:**
```bash
# Ver logs de Vercel
vercel logs --prod

# Buscar:
# [WEBHOOK] Email received
# [WEBHOOK] Email saved to database
```

**Verificar en base de datos:**
```sql
SELECT * FROM admin_emails ORDER BY received_at DESC LIMIT 5;
```

**Verificar en Panel Admin:**
- Ir a: https://app.verifactu.business/dashboard/admin/emails
- El email debería aparecer en la bandeja de entrada

---

### 5. 🔐 Variables de Entorno

**`.env.local` (desarrollo):**
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/verifactu_app

# Resend
RESEND_API_KEY=re_abc123...
RESEND_WEBHOOK_SECRET=whsec_xyz789...
```

**Vercel (producción):**
```bash
vercel env add DATABASE_URL production
# Pegar URL de PostgreSQL

vercel env add RESEND_WEBHOOK_SECRET production
# Pegar webhook secret
```

---

## 📊 Esquema de Base de Datos

### Tabla `admin_emails`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | ID único |
| `message_id` | text | ID de Resend (único) |
| `from_email` | text | Remitente |
| `from_name` | text | Nombre del remitente |
| `to_email` | text | Destinatario (soporte@...) |
| `subject` | text | Asunto |
| `text_content` | text | Contenido texto plano |
| `html_content` | text | Contenido HTML |
| `priority` | text | `low`, `normal`, `high` |
| `status` | text | `pending`, `responded`, `archived`, `spam` |
| `tags` | text[] | Tags para categorización |
| `resend_data` | jsonb | Payload completo de Resend |
| `received_at` | timestamptz | Fecha de recepción |
| `responded_at` | timestamptz | Fecha de respuesta |
| `responded_by` | text | Usuario que respondió |
| `archived_at` | timestamptz | Fecha de archivo |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Última actualización |

**Índices:**
- `idx_admin_emails_status` - Búsquedas por estado
- `idx_admin_emails_priority` - Filtros por prioridad
- `idx_admin_emails_received_at` - Orden cronológico
- `idx_admin_emails_from_email` - Búsquedas por remitente
- `idx_admin_emails_message_id` - Unicidad y búsqueda rápida

---

## 🤖 Detección Automática

### Prioridad

**Alta (`high`):**
- Keywords: urgente, importante, crítico, error, problema, no funciona, ayuda, bloqueado

**Baja (`low`):**
- Keywords: pregunta, duda, consulta, información, sugerencia

**Normal (`normal`):**
- Todo lo demás

### Spam

**Detecta como spam si contiene:**
- Keywords: viagra, casino, lottery, winner, congratulations, prize, click here, unsubscribe
- Dominios: temp-mail, guerrillamail, 10minutemail

Los emails marcados como spam:
- Se guardan con `status = 'spam'`
- No aparecen en filtro "Todos" por defecto
- Se pueden revisar con filtro "Spam"

---

## 🎯 Funcionalidades del Panel Admin

### Tab "Bandeja de entrada"

**Características:**
- ✅ Lista de emails con prioridad visual
- ✅ Filtros por status (todos/pendientes/respondidos)
- ✅ Panel de detalle con contenido completo
- ✅ Marcar como respondido/pendiente/archivado
- ✅ Botón para responder (abre cliente de email)
- ✅ Timestamp relativo ("hace 15 min")
- ✅ Stats en tiempo real

### Tab "Testing"

**Características:**
- ✅ Enviar emails de prueba
- ✅ 5 templates disponibles
- ✅ Resultados inline
- ✅ Pre-rellenado con email de testing

---

## 📈 Próximos Pasos (Opcional)

### Notificaciones en Tiempo Real

**Cuando llega email de alta prioridad:**
```typescript
// En webhook
if (priority === 'high' && !spam) {
  // Enviar notificación
  await sendSlackNotification({
    channel: '#soporte',
    text: `🔴 Email urgente de ${from}: ${subject}`,
    url: `https://app.verifactu.business/dashboard/admin/emails/${emailId}`
  });
}
```

### Respuestas Automáticas

**Con Isaak (OpenAI):**
```typescript
// Generar borrador de respuesta
const draft = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{
    role: 'system',
    content: 'Eres asistente de soporte de VeriFactu Business...'
  }, {
    role: 'user',
    content: emailContent
  }]
});
```

### Analytics

**Métricas a trackear:**
- Tiempo promedio de respuesta
- Emails por día/semana/mes
- Temas más frecuentes
- Satisfacción del cliente (encuesta post-respuesta)

---

## 🐛 Troubleshooting

### El webhook no recibe emails

**Verificar:**
1. ✅ Registros MX configurados correctamente
2. ✅ DNS propagado (usar https://dnschecker.org)
3. ✅ Webhook activo en Resend dashboard
4. ✅ URL del webhook correcta y accesible
5. ✅ `RESEND_WEBHOOK_SECRET` configurado

**Test manual del webhook:**
```bash
curl -X POST https://app.verifactu.business/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -H "resend-signature: tu-webhook-secret" \
  -d '{
    "type": "email.received",
    "created_at": "2026-01-18T10:00:00Z",
    "data": {
      "message_id": "test-123",
      "from": {"email": "test@example.com"},
      "to": ["soporte@verifactu.business"],
      "subject": "Test",
      "text": "Contenido de prueba"
    }
  }'
```

### Los emails no aparecen en el panel

**Verificar:**
1. ✅ Migración de BD aplicada
2. ✅ Tabla `admin_emails` existe
3. ✅ `DATABASE_URL` configurada correctamente
4. ✅ Conexión a PostgreSQL funcionando

**Query de debug:**
```sql
-- Ver últimos emails
SELECT id, from_email, subject, status, received_at 
FROM admin_emails 
ORDER BY received_at DESC 
LIMIT 10;

-- Ver stats
SELECT status, COUNT(*) 
FROM admin_emails 
GROUP BY status;
```

### Error 500 en API

**Revisar logs:**
```bash
# Desarrollo
# Ver terminal donde corre pnpm dev

# Producción
vercel logs --prod

# Buscar:
# [API] Error fetching emails
# [WEBHOOK] Error processing email
```

---

## ✅ Checklist de Deployment

- [ ] Migración de BD aplicada en producción
- [ ] `DATABASE_URL` configurada en Vercel
- [ ] `RESEND_WEBHOOK_SECRET` configurada en Vercel
- [ ] Registros MX configurados en DNS
- [ ] Webhook creado en Resend dashboard
- [ ] Email de prueba enviado y recibido
- [ ] Email visible en panel admin
- [ ] Cambio de status funciona correctamente
- [ ] Filtros funcionan
- [ ] Tab de testing funciona

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de Vercel
2. Verifica la configuración de Resend
3. Comprueba la conexión a PostgreSQL
4. Consulta la documentación de Resend: https://resend.com/docs/webhooks

---

**Última actualización:** 18 de enero de 2026  
**Estado:** ✅ Implementado - Pendiente configuración en Resend
