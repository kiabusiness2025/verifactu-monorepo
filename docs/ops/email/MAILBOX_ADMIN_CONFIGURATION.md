# 📧 Configuración de Buzón de Correo - Panel de Admin

**Última actualización:** Enero 19, 2026  
**Estado:** ✅ Implementado y listo para usar

---

## 📋 Descripción General

El panel de administración ahora permite gestionar completamente el buzón de correo corporativo desde `soporte@verifactu.business`:

- ✅ **Ver bandeja de entrada** - Recibe y visualiza emails automáticamente
- ✅ **Responder correos** - Envía respuestas directamente desde soporte@verifactu.business
- ✅ **Gestionar estado** - Marca emails como pendientes, respondidos o archivados
- ✅ **Filtros y búsqueda** - Organiza emails por prioridad y estado
- ✅ **Historial de respuestas** - Registra todas las comunicaciones

---

## 🚀 Acceso al Panel

### 1. Navegar al Panel de Admin

```
https://app.verifactu.business/dashboard/admin/emails
```

### 2. Requisitos

- ✅ Estar autenticado en la plataforma
- ✅ Ser usuario administrador (email en `ADMIN_EMAILS`)
- ✅ Tener acceso a `/dashboard/admin`

### 3. Configuración necesaria en Vercel

La cuenta de correo `soporte@verifactu.business` está configurada en **Resend** con las variables:

```env
RESEND_API_KEY=re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA
ADMIN_EMAILS=kiabusiness2025@gmail.com
```

---

## 📥 Bandeja de Entrada

### Ver Emails Recibidos

1. Accede a `/dashboard/admin/emails`
2. Haz click en la pestaña **"Bandeja de entrada"**
3. Los emails aparecen ordenados por fecha (más reciente primero)

### Información Visible

Para cada email puedes ver:

| Campo | Descripción |
|-------|-------------|
| **Prioridad** | 🔴 Alta / 🔵 Normal / ⚪ Baja |
| **Estado** | ⏱️ Pendiente / ✅ Respondido / 📦 Archivado |
| **De** | Quién envió el email |
| **Asunto** | Tema del mensaje |
| **Fecha** | Cuándo se recibió (relativo "hace X minutos") |
| **Contenido** | Vista previa del mensaje |

### Filtros Disponibles

```
• Todos (muestra todos los emails)
• Pendientes (solo emails sin responder)
• Respondidos (emails que ya fueron respondidos)
```

### Estadísticas

En la parte superior ves:

- 📊 **Total de emails** - Número total recibido
- ⏱️ **Pendientes** - Requieren respuesta
- ✅ **Respondidos** - Ya tienes respuesta

---

## 📤 Enviar Respuestas

### 1. Seleccionar un Email

1. En la bandeja de entrada, haz click en un email para ver los detalles
2. El panel derecho muestra el contenido completo

### 2. Responder desde soporte@verifactu.business

Botón azul: **"Responder desde soporte@verifactu.business"**

Se abrirá un modal con:

- ✅ **Desde:** soporte@verifactu.business (fijo, no editable)
- ✅ **Para:** Email del remitente (auto-rellenado)
- ✅ **Asunto:** Re: [asunto original] (editable)
- ✅ **Mensaje:** Tu respuesta (campo libre)

### 3. Enviar la Respuesta

1. Escribe tu mensaje en el campo de texto
2. Haz click en **"Enviar respuesta"**
3. Espera confirmación (2-3 segundos)
4. El email se marca automáticamente como "Respondido" ✅

### Ejemplo de Respuesta

```
Asunto: Re: ¿Cómo puedo validar mis facturas?

Mensaje:
Hola,

Gracias por contactarnos. Para validar tus facturas en Verifactu, 
sigue estos pasos:

1. Inicia sesión en tu cuenta
2. Ve a la sección "Mis Documentos"
3. Selecciona la factura a validar
4. Haz click en "Validar"

Si tienes más dudas, estamos aquí para ayudarte.

Saludos,
Equipo Verifactu
```

---

## 🔧 Gestionar Emails

### Estados de Email

Cada email puede estar en uno de estos estados:

| Estado | Icono | Significado |
|--------|-------|------------|
| Pendiente | ⏱️ | Requiere tu respuesta |
| Respondido | ✅ | Ya enviaste una respuesta |
| Archivado | 📦 | Guardado pero sin acciones pendientes |

### Cambiar Estado

Para un email seleccionado, puedes:

- **Marcar como respondido** (si está pendiente)
- **Marcar como pendiente** (si lo reabriste)
- **Archivar** (guarda pero sin acciones)

### Actualizar Lista

Haz click en **"Actualizar"** (botón azul con icono de refresh) para cargar nuevos emails.

---

## 🔄 Arquitectura Técnica

### Base de Datos

Se usan dos tablas principales:

#### `admin_emails` (Emails Recibidos)
```sql
CREATE TABLE admin_emails (
  id UUID PRIMARY KEY,
  message_id TEXT,           -- ID de Resend
  from_email TEXT,          -- Remitente
  from_name TEXT,           -- Nombre del remitente
  to_email TEXT,            -- Destinatario (soporte@...)
  subject TEXT,             -- Asunto
  text_content TEXT,        -- Contenido texto plano
  html_content TEXT,        -- Contenido HTML
  priority TEXT,            -- low, normal, high
  status TEXT,              -- pending, responded, archived, spam
  received_at TIMESTAMP,    -- Cuándo se recibió
  responded_at TIMESTAMP,   -- Cuándo se respondió (si aplica)
  response_email_id TEXT,   -- ID del email de respuesta
  created_at TIMESTAMP
);
```

#### `admin_email_responses` (Respuestas Enviadas)
```sql
CREATE TABLE admin_email_responses (
  id UUID PRIMARY KEY,
  admin_email_id UUID,              -- Referencia al email original
  response_email_id TEXT,           -- ID de Resend de la respuesta
  sent_at TIMESTAMP,                -- Cuándo se envió
  from_email TEXT,                  -- Siempre: soporte@verifactu.business
  to_email TEXT,                    -- A quién se envió
  subject TEXT,                     -- Asunto de la respuesta
  content TEXT,                     -- Contenido de la respuesta
  created_at TIMESTAMP
);
```

### API Endpoints

#### GET `/api/admin/emails`
Obtiene lista de emails con filtros

**Parámetros:**
```
?status=pending|responded|all
?priority=high|normal|low|all
?limit=50
?offset=0
```

**Respuesta:**
```json
{
  "emails": [...],
  "total": 42,
  "pending": 5,
  "responded": 35,
  "archived": 2,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### PATCH `/api/admin/emails`
Actualiza estado de un email

**Body:**
```json
{
  "emailId": "uuid",
  "status": "pending|responded|archived|spam",
  "respondedBy": "email@admin.com"  // opcional
}
```

#### POST `/api/admin/emails/send`
Envía una respuesta desde soporte@verifactu.business

**Body:**
```json
{
  "originalEmailId": "uuid",
  "subject": "Re: Asunto original",
  "message": "Tu mensaje aquí"
}
```

**Respuesta:**
```json
{
  "success": true,
  "messageId": "id-de-resend",
  "recipient": "usuario@ejemplo.com",
  "subject": "Re: Asunto original"
}
```

#### GET `/api/admin/emails/send`
Obtiene respuestas enviadas para un email

**Parámetros:**
```
?emailId=uuid
```

---

## 🔐 Seguridad

### Autenticación

Todos los endpoints requieren:
- ✅ Usuario autenticado
- ✅ Email en lista `ADMIN_EMAILS`

### Límites

- Máximo 50 emails por página
- Validación de campos obligatorios
- Prevención de inyección SQL (prepared statements)

### Auditoría

Se registra:
- Quién respondió cada email
- Cuándo se envió la respuesta
- Contenido de la respuesta
- ID de mensaje de Resend

---

## 🐛 Troubleshooting

### No veo emails en la bandeja

**Posibles causas:**

1. **Webhook de Resend no configurado**
   - Verificar: https://resend.com/webhooks
   - URL debe ser: `https://app.verifactu.business/api/webhooks/resend/inbound`

2. **Base de datos no actualizada**
   - Ejecutar migración: `db/migrations/003_add_email_responses_table.sql`
   - Verificar tabla: `SELECT * FROM admin_emails;`

3. **No hay emails recibidos**
   - Verificar que soporte@verifactu.business está verificado en Resend
   - Enviar email de prueba desde `/dashboard/admin/emails?tab=testing`

### Error al enviar respuesta

**"Failed to send email"**

Verificar:
- ✅ `RESEND_API_KEY` configurada en Vercel
- ✅ Resend API funciona: `curl -X GET https://api.resend.com/api/keys -H "Authorization: Bearer $KEY"`
- ✅ Email de destinatario es válido

**"Email not found"**

- El email fue eliminado
- ID incorrecto
- Actualizar la página

### Respuestas no se guardan

**Verificar tabla `admin_email_responses`:**

```sql
SELECT * FROM admin_email_responses 
WHERE admin_email_id = 'uuid-del-email'
ORDER BY sent_at DESC;
```

---

## ✅ Checklist de Configuración

- [ ] `RESEND_API_KEY` en Vercel
- [ ] `ADMIN_EMAILS` incluye tu email
- [ ] Webhook de Resend configurado
- [ ] Migración de BD aplicada (`003_add_email_responses_table.sql`)
- [ ] Tabla `admin_emails` existe
- [ ] Tabla `admin_email_responses` existe
- [ ] Acceso a `/dashboard/admin/emails`
- [ ] Prueba: Enviar email de test desde el panel
- [ ] Prueba: Responder a un email de test

---

## 📞 Soporte

Para reportar problemas:

1. Verificar logs en terminal: `pnpm dev` output
2. Verificar logs de Vercel: `vercel logs --prod`
3. Revisar estado de Resend API
4. Ejecutar queries de debug en base de datos

---

**Última actualización:** Enero 19, 2026  
**Versión:** 1.0 - Implementación completa  
**Responsable:** Kiabusiness  
**Estado:** ✅ Producción lista
