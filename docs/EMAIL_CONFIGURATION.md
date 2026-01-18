# 📧 Sistema de Correos Electrónicos

Sistema completo de envío de correos transaccionales usando **Resend** con plantillas HTML diseñadas.

---

## 📦 Configuración Actual

### Variables de Entorno

```bash
# .env.local (landing/app)
RESEND_API_KEY=re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA
RESEND_FROM=Verifactu Business <soporte@verifactu.business>

# Administradores
ADMIN_EMAILS=kiabusiness2025@gmail.com,soporte@verifactu.business
```

### Dominios de Email

- **Envío**: `soporte@verifactu.business` (principal)
- **Admin**: `kiabusiness2025@gmail.com`
- **Reply-to**: `soporte@verifactu.business`

---

## 📬 Plantillas Disponibles

### 1. **Email de Verificación** ([VerifyEmail.tsx](../apps/landing/emails/VerifyEmail.tsx))
**Trigger**: Registro de nuevo usuario

**Contenido**:
- Botón de verificación con enlace
- Mensaje de bienvenida
- Soporte de ayuda
- Expiración del enlace (24h)

**Función**: `sendVerificationEmail()`

---

### 2. **Email de Bienvenida** ([WelcomeEmail.tsx](../apps/landing/emails/WelcomeEmail.tsx))
**Trigger**: Después de verificar email

**Contenido**:
- Saludo personalizado
- Primeros pasos
- Recursos útiles
- CTA para empezar

**Función**: `sendWelcomeEmail()`

---

### 3. **Reset de Contraseña** ([ResetPasswordEmail.tsx](../apps/landing/emails/ResetPasswordEmail.tsx))
**Trigger**: Usuario olvida contraseña

**Contenido**:
- Botón para restablecer
- Advertencia de seguridad
- Enlace de soporte
- Expiración del enlace (1h)

**Función**: `sendPasswordResetEmail()`

---

### 4. **Contraseña Cambiada** ([PasswordChangedEmail.tsx](../apps/landing/emails/PasswordChangedEmail.tsx))
**Trigger**: Contraseña modificada exitosamente

**Contenido**:
- Confirmación del cambio
- Alerta de seguridad
- Contacto de emergencia
- Fecha y hora del cambio

**Función**: `sendPasswordChangedEmail()`

---

### 5. **Invitación a Equipo** ([TeamInviteEmail.tsx](../apps/landing/emails/TeamInviteEmail.tsx))
**Trigger**: Usuario invita a otro a su empresa

**Contenido**:
- Nombre del invitador
- Empresa destino
- Rol asignado
- Botón de aceptación

**Función**: `sendTeamInviteEmail()`

---

## 🎨 Componentes Reutilizables

### EmailHeader ([EmailHeader.tsx](../apps/landing/emails/EmailHeader.tsx))

**Incluye**:
- Logo de Verifactu
- Información de contacto: `soporte@verifactu.business`
- Texto descriptivo
- Estilo corporativo

**Uso**:
```tsx
import { EmailHeader } from './EmailHeader';

<EmailHeader />
```

---

### EmailFooter ([EmailHeader.tsx](../apps/landing/emails/EmailHeader.tsx))

**Incluye**:
- Copyright © 2026 Verifactu Business
- Enlace a soporte: `soporte@verifactu.business`
- Enlaces legales (Privacidad, Términos)
- Diseño responsive

**Uso**:
```tsx
import { EmailFooter } from './EmailHeader';

<EmailFooter />
```

---

## 🚀 Servicio de Email ([emailService.ts](../apps/landing/lib/email/emailService.ts))

### Funciones Principales

```typescript
// Verificación
sendVerificationEmail({
  email: string,
  userName: string,
  verificationLink: string
})

// Bienvenida
sendWelcomeEmail({
  email: string,
  userName: string
})

// Reset contraseña
sendPasswordResetEmail({
  email: string,
  userName: string,
  resetLink: string
})

// Contraseña cambiada
sendPasswordChangedEmail({
  email: string,
  userName: string
})

// Invitación equipo
sendTeamInviteEmail({
  inviteeEmail: string,
  inviterName: string,
  companyName: string,
  acceptLink: string,
  role?: string
})

// Email personalizado
sendCustomEmail({
  to: string,
  subject: string,
  html: string
})
```

---

## 🎯 Integración con Resend

### API Endpoint
```
POST https://api.resend.com/emails
```

### Headers
```json
{
  "Authorization": "Bearer RESEND_API_KEY",
  "Content-Type": "application/json"
}
```

### Payload
```json
{
  "from": "Verifactu Business <soporte@verifactu.business>",
  "to": "usuario@ejemplo.com",
  "subject": "Asunto del email",
  "html": "<html>...</html>"
}
```

---

## ✅ Estado de Configuración

| Componente | Estado | Notas |
|------------|--------|-------|
| API Key Resend | ✅ Configurado | `re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA` |
| Dominio verificado | ✅ `soporte@verifactu.business` | Verificar en Resend dashboard |
| Plantillas creadas | ✅ 5 plantillas | Verificación, Bienvenida, Reset, Cambio, Invitación |
| Header/Footer | ✅ Componentes reutilizables | Con logo y firma |
| Email de admin | ✅ `kiabusiness2025@gmail.com` | En ADMIN_EMAILS |
| Email soporte | ✅ `soporte@verifactu.business` | Para comunicaciones |

---

## 🔧 Pasos para Usar

### 1. Verificar Dominio en Resend

1. Ir a [Resend Dashboard](https://resend.com/domains)
2. Añadir dominio: `verifactu.business`
3. Configurar registros DNS:
   - **SPF**: `v=spf1 include:_spf.resend.com ~all`
   - **DKIM**: Copiar desde dashboard
   - **DMARC**: `v=DMARC1; p=none;`

### 2. Configurar Variables en Vercel

```bash
# En Vercel → Settings → Environment Variables
RESEND_API_KEY=re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA
RESEND_FROM=Verifactu Business <soporte@verifactu.business>
ADMIN_EMAILS=kiabusiness2025@gmail.com,soporte@verifactu.business
```

### 3. Probar Envío

```typescript
import { sendVerificationEmail } from '@/lib/email/emailService';

await sendVerificationEmail({
  email: 'test@ejemplo.com',
  userName: 'Usuario Test',
  verificationLink: 'https://verifactu.business/verify?token=xxx'
});
```

---

## 🎨 Diseño de Firma

### Logo
- **URL**: `https://verifactu.business/brand/logo-horizontal-light.png`
- **Tamaño**: 140px width
- **Formato**: PNG con fondo transparente

### Información de Contacto
```
Soporte | Verifactu Business
soporte@verifactu.business
verifactu.business
Registro de usuarios y comunicaciones generales
```

### Colores Corporativos
- **Azul principal**: `#0060F0`
- **Texto oscuro**: `#1b2a3a`
- **Texto secundario**: `#6b7c8a`
- **Bordes**: `#e0e6eb`

---

## 📊 Logs y Monitoreo

### Console Logs
```typescript
// Éxito
[📧 EMAIL] Sent successfully: { 
  to: 'usuario@ejemplo.com', 
  subject: 'Asunto', 
  messageId: 'xxx' 
}

// Error
[📧 EMAIL] Exception: { error details }
```

### Verificar en Resend Dashboard
- Ver emails enviados
- Estado de entrega
- Tasas de apertura
- Bounces y quejas

---

## 🚨 Troubleshooting

### Email no se envía
1. ✅ Verificar `RESEND_API_KEY` configurado
2. ✅ Confirmar dominio verificado en Resend
3. ✅ Revisar logs en Resend Dashboard
4. ✅ Verificar que el email destino sea válido

### Email va a Spam
1. ✅ Configurar registros SPF/DKIM/DMARC
2. ✅ Usar dominio verificado
3. ✅ Evitar palabras spam en asunto
4. ✅ Incluir enlace de "unsubscribe"

### Plantilla no renderiza
1. ✅ Verificar HTML válido
2. ✅ Revisar imports de componentes
3. ✅ Confirmar sintaxis JSX correcta
4. ✅ Testear en cliente email (Gmail, Outlook)

---

## 📝 Próximos Pasos

- [ ] Configurar webhooks de Resend para tracking
- [ ] Añadir analytics de apertura/clicks
- [ ] Crear plantillas para facturas
- [ ] Email de recordatorio de pago
- [ ] Newsletter/comunicaciones masivas
- [ ] Implementar sistema de templates editables

---

## 🔗 Referencias

- [Resend Docs](https://resend.com/docs)
- [React Email](https://react.email)
- [Email Best Practices](https://www.emailonacid.com/blog/article/email-development/email-development-best-practices-2/)
