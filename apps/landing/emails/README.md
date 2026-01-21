# 📧 Sistema de Plantillas de Email - Verifactu Business

## 📋 Descripción

Sistema completo de plantillas de correo electrónico para todos los flujos de registro, confirmación y recuperación de contraseña en Verifactu Business.

**Características:**
- ✨ Diseño moderno y profesional
- 🎨 Branding consistente de Verifactu
- 💌 Frases optimistas de Isaak
- 📱 Responsive en todos los dispositivos
- 🔒 Enfoque en seguridad y confianza
- 🚀 Integración lista con Resend

---

## 🗂️ Estructura

```
apps/landing/
├── emails/
│   ├── EmailHeader.tsx          # Componentes reutilizables
│   ├── VerifyEmail.tsx          # Verificación de email
│   ├── WelcomeEmail.tsx         # Bienvenida
│   ├── ResetPasswordEmail.tsx   # Recuperación de contraseña
│   ├── PasswordChangedEmail.tsx # Confirmación de cambio
│   └── TeamInviteEmail.tsx      # Invitación a equipo
└── lib/email/
    └── emailService.ts          # Servicio de envío (Resend)
```

---

## 📧 Plantillas Disponibles

### 1. Verificación de Email (`VerifyEmail.tsx`)

**Cuándo se envía:** Después del registro inicial  
**Asunto:** ✨ Verifica tu correo en Verifactu Business

**Contenido:**
- Saludo personalizado
- Explicación clara del siguiente paso
- Botón de verificación destacado
- Enlace de respaldo
- Información de seguridad
- Tiempo de expiración (24h)

**Uso:**
```typescript
import { sendVerificationEmail } from '@/lib/email/emailService';

await sendVerificationEmail({
  email: user.email,
  userName: user.name,
  verificationLink: `https://verifactu.business/auth/verify?token=${verificationToken}`
});
```

---

### 2. Bienvenida (`WelcomeEmail.tsx`)

**Cuándo se envía:** Después de verificar el email  
**Asunto:** 🎉 ¡Bienvenido a Verifactu Business!

**Contenido:**
- Felicitación entusiasta
- Lista de características disponibles
- Primeros pasos recomendados
- Dato motivador de Isaak
- Enlace directo al dashboard

**Uso:**
```typescript
import { sendWelcomeEmail } from '@/lib/email/emailService';

await sendWelcomeEmail({
  userName: user.name,
  email: user.email,
  dashboardLink: 'https://app.verifactu.business/dashboard'
});
```

---

### 3. Recuperación de Contraseña (`ResetPasswordEmail.tsx`)

**Cuándo se envía:** Cuando el usuario solicita restablecer contraseña  
**Asunto:** 🔐 Restablecer tu contraseña en Verifactu Business

**Contenido:**
- Explicación del proceso
- Advertencia de seguridad
- Botón para restablecer
- Tiempo de expiración (60 min, configurable)
- Consejos de contraseña segura
- Aviso: "Si no solicitaste esto, ignora"

**Uso:**
```typescript
import { sendResetPasswordEmail } from '@/lib/email/emailService';

await sendResetPasswordEmail({
  userName: user.name,
  email: user.email,
  resetLink: `https://verifactu.business/auth/reset-password?token=${resetToken}`,
  expiryMinutes: 60
});
```

---

### 4. Confirmación de Cambio (`PasswordChangedEmail.tsx`)

**Cuándo se envía:** Después de cambiar exitosamente la contraseña  
**Asunto:** ✅ Tu contraseña ha sido actualizada

**Contenido:**
- Confirmación exitosa
- Información de seguridad del cambio
- Botón para ir al dashboard
- Instrucciones si fue no autorizado
- Advertencia anti-fraude

**Uso:**
```typescript
import { sendPasswordChangedEmail } from '@/lib/email/emailService';

await sendPasswordChangedEmail({
  userName: user.name,
  email: user.email,
  dashboardLink: 'https://app.verifactu.business/dashboard'
});
```

---

### 5. Invitación a Equipo (`TeamInviteEmail.tsx`)

**Cuándo se envía:** Cuando se invita a un usuario a colaborar  
**Asunto:** 👋 {inviterName} te ha invitado a colaborar en {companyName}

**Contenido:**
- Nombre del invitador y empresa
- Lista de beneficios
- Rol del invitado
- Botón de aceptación
- Detalles de invitación
- Información de privacidad

**Uso:**
```typescript
import { sendTeamInviteEmail } from '@/lib/email/emailService';

await sendTeamInviteEmail({
  inviteeEmail: newUser.email,
  inviterName: currentUser.name,
  companyName: company.name,
  acceptLink: `https://verifactu.business/invite?code=${inviteCode}`,
  role: 'contador' // o 'gerente', 'asistente', etc.
});
```

---

## 🎨 Componentes Reutilizables

Todos los emails usan estos componentes base (`EmailHeader.tsx`):

### `EmailHeader()`
- Logo de Verifactu
- Contacto de soporte
- Información branding

### `EmailFooter()`
- Copyright
- Enlace de soporte
- Links a política y términos
- Año actual automático

### `EmailContainer()`
- Wrapper responsivo
- Estilos base consistentes
- Sombra y bordes

### `CTAButton()`
- Botón de llamada a acción
- Variantes: primary (azul) y secondary (gris)
- Responsive y accesible

---

## 🚀 Integración con Resend

### Configuración

1. **Agregar API Key a .env.local:**
```dotenv
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXX
```

2. **Verificar el package.json:**
```json
{
  "dependencies": {
    "resend": "^3.4.0"
  }
}
```

Ya está incluido ✅

### Uso

```typescript
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendPasswordChangedEmail,
  sendTeamInviteEmail,
  sendCustomEmail
} from '@/lib/email/emailService';

// Todos retornan:
// { success: true, messageId: string } o
// { success: false, error: any }
```

---

## 📱 Dispositivos Soportados

Todas las plantillas son **100% responsivas** y se ven bien en:
- ✅ Desktop (1920px+)
- ✅ Tablet (768px-1024px)
- ✅ Mobile (320px-767px)
- ✅ Clientes de email diversos (Gmail, Outlook, Apple Mail, etc.)

---

## 🛡️ Seguridad

Cada plantilla incluye:
- ⏱️ **Tokens con expiración**: Verificación (24h), Reset (60m)
- 🔒 **HTTPS**: Todos los enlaces usan protocolo seguro
- 📋 **Anti-phishing**: Aviso claro si no solicitaste la acción
- 🔐 **Privacidad**: Recordatorio de que nunca pediremos contraseña por email
- 📊 **Auditoría**: Log automático de envíos

---

## 💬 Frases de Isaak Incluidas

Las plantillas contienen frases optimistas diseñadas para reducir miedo:

- **Verificación:** "Puedes trabajar con tranquilidad en tu contabilidad"
- **Bienvenida:** "Los usuarios reportan 3x más confianza en sus finanzas"
- **Reset:** "Nada se pierde. Tu contraseña está encriptada y segura"
- **Cambio:** "Tu cuenta está protegida"
- **Invitación:** "Cada rol tiene permisos específicos para tu privacidad"

---

## 🔧 Extensión Futura

Para agregar nuevas plantillas:

1. Crear componente React en `apps/landing/emails/NewEmail.tsx`
2. Usar estructura base de `EmailHeader`, `EmailFooter`, `EmailContainer`
3. Agregar función generadora HTML en `emailService.ts`
4. Exportar función `sendNewEmail()` pública
5. Documentar en esta guía

**Ejemplo mínimo:**
```typescript
// apps/landing/emails/NewEmail.tsx
export function NewEmailTemplate({ email, customData }: Props) {
  return (
    <EmailContainer>
      <EmailHeader />
      {/* Tu contenido */}
      <EmailFooter />
    </EmailContainer>
  );
}
```

```typescript
// apps/landing/lib/email/emailService.ts
function generateNewEmailHtml(data: Props): string {
  const content = `<!-- tu HTML -->`;
  return wrapEmail(content);
}

export async function sendNewEmail(data: Props) {
  const html = generateNewEmailHtml(data);
  return sendEmail({
    to: data.email,
    subject: 'Tu asunto aquí',
    html
  });
}
```

---

## 📊 Testing

### Testing Local

```typescript
// Crear archivo de prueba
import { sendVerificationEmail } from '@/lib/email/emailService';

const result = await sendVerificationEmail({
  email: 'test@example.com',
  userName: 'Test User',
  verificationLink: 'https://verifactu.business/verify?token=test123'
});

console.log(result); // { success: true, messageId: '...' }
```

### Preview en Navegador

Para previsualizar HTML sin enviar:
```typescript
// apps/landing/app/api/email-preview/route.ts
import { generateVerificationEmailHtml } from '@/lib/email/emailService';

export async function GET() {
  const html = generateVerificationEmailHtml({
    email: 'test@example.com',
    verificationLink: 'https://example.com',
    userName: 'Test'
  });
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

Luego visita: `http://localhost:3001/api/email-preview`

---

## 📝 Notas Importantes

1. **Resend Rate Limits:** 
   - Free: 100 emails/día
   - Pro: ilimitados
   - Considera agregación/delay si sendeas masivamente

2. **Email Bouncing:**
   - Los usuarios con emails inválidos recibirán bounces
   - Resend notifica automáticamente

3. **SPF/DKIM:**
   - Ya configurado en `notificaciones@verifactu.business`
   - Asegura que los emails no vayan a spam

4. **Templates Dinámicas:**
   - El sistema genera HTML en cada envío
   - Para emails recurrentes, considera caching

---

## 🎯 Checklist de Implementación

- [ ] RESEND_API_KEY configurado en .env.local
- [ ] Función sendVerificationEmail integrada en auth/register
- [ ] Función sendWelcomeEmail después de email verification
- [ ] Función sendResetPasswordEmail en forgot-password
- [ ] Función sendPasswordChangedEmail en change-password
- [ ] Función sendTeamInviteEmail en team invitations
- [ ] Testing local de todos los emails
- [ ] Verificación de arrivals en Resend dashboard
- [ ] Prueba en producción (Vercel)

---

**Documentación creada por:** Isaak  
**Fecha:** 14 de Enero de 2026  
**Versión:** 1.0.0


