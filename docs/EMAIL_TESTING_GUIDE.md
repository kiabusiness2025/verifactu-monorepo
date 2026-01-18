# 🧪 Testing de Emails en Local

Guía completa para probar todos los flujos de correos electrónicos en desarrollo local.

---

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

```bash
# apps/app/.env.local
RESEND_API_KEY=re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA
RESEND_FROM_NOREPLY=Verifactu Business <noreply@verifactu.business>
RESEND_FROM_SUPPORT=Verifactu Business <soporte@verifactu.business>
RESEND_FROM_INFO=Verifactu Business <info@verifactu.business>
NODE_ENV=development
```

### 2. Iniciar Servidor de Desarrollo

```bash
cd apps/app
pnpm dev
```

### 3. Abrir UI de Testing

Navega a: **http://localhost:3000/test/emails**

---

## 🎯 Métodos de Testing

### Opción 1: UI Visual (Recomendado)

La forma más fácil de probar emails:

1. Abre **http://localhost:3000/test/emails**
2. Ingresa tu email de prueba: `expertestudiospro@gmail.com`
3. Selecciona el tipo de email a probar
4. Click en "Enviar Email de Prueba"
5. Revisa tu bandeja de entrada

**Tipos disponibles**:
- 🎯 **Todos los emails** - Envía los 5 tipos a la vez
- ✉️ **Verificación** - Email de confirmación de cuenta
- 👋 **Bienvenida** - Email post-registro
- 🔑 **Reset contraseña** - Recuperación de cuenta
- ✅ **Contraseña cambiada** - Confirmación de cambio
- 👥 **Invitación** - Invitar a equipo

---

### Opción 2: API con cURL

Para testing automatizado o CI/CD:

#### Enviar todos los emails
```bash
curl -X POST http://localhost:3000/api/test/emails \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "expertestudiospro@gmail.com"
  }'
```

#### Enviar solo verificación
```bash
curl -X POST http://localhost:3000/api/test/emails \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "verification",
    "testEmail": "expertestudiospro@gmail.com"
  }'
```

#### Enviar solo bienvenida
```bash
curl -X POST http://localhost:3000/api/test/emails \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "welcome",
    "testEmail": "expertestudiospro@gmail.com"
  }'
```

#### Enviar solo reset de contraseña
```bash
curl -X POST http://localhost:3000/api/test/emails \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "password-reset",
    "testEmail": "expertestudiospro@gmail.com"
  }'
```

#### Enviar solo cambio de contraseña
```bash
curl -X POST http://localhost:3000/api/test/emails \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "password-changed",
    "testEmail": "expertestudiospro@gmail.com"
  }'
```

#### Enviar solo invitación a equipo
```bash
curl -X POST http://localhost:3000/api/test/emails \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "team-invite",
    "testEmail": "expertestudiospro@gmail.com"
  }'
```

---

### Opción 3: JavaScript/TypeScript

Para scripts de testing o integración:

```typescript
// test-emails.ts
async function testEmails() {
  const response = await fetch('http://localhost:3000/api/test/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testEmail: 'expertestudiospro@gmail.com'
      // Omitir emailType para enviar todos
    })
  });

  const result = await response.json();
  console.log(result);
}

testEmails();
```

---

## 📧 Detalles de cada Email

### 1. Email de Verificación

**Trigger**: Usuario se registra  
**Remitente**: `noreply@verifactu.business`  
**Contenido**:
- Botón de verificación con enlace
- Expiración: 24 horas
- Link de ayuda a soporte

**Datos de prueba**:
```javascript
{
  email: "expertestudiospro@gmail.com",
  userName: "Usuario Test",
  verificationLink: "http://localhost:3000/verify?token=test_token_12345"
}
```

**Preview**: Verifica que:
- ✅ Logo de Verifactu aparece
- ✅ Botón azul "Verificar Email" está presente
- ✅ Firma con `soporte@verifactu.business`
- ✅ Diseño responsive

---

### 2. Email de Bienvenida

**Trigger**: Usuario verifica su email  
**Remitente**: `noreply@verifactu.business`  
**Contenido**:
- Saludo personalizado
- Primeros pasos
- Recursos útiles
- CTA para comenzar

**Datos de prueba**:
```javascript
{
  email: "expertestudiospro@gmail.com",
  userName: "Usuario Test"
}
```

**Preview**: Verifica que:
- ✅ Mensaje de bienvenida personalizado
- ✅ Links a tutoriales
- ✅ Botón "Comenzar Ahora"

---

### 3. Email de Reset de Contraseña

**Trigger**: Usuario olvida contraseña  
**Remitente**: `noreply@verifactu.business`  
**Contenido**:
- Botón de reset
- Advertencia de seguridad
- Expiración: 1 hora
- Contacto de soporte

**Datos de prueba**:
```javascript
{
  email: "expertestudiospro@gmail.com",
  userName: "Usuario Test",
  resetLink: "http://localhost:3000/reset-password?token=reset_token_12345"
}
```

**Preview**: Verifica que:
- ✅ Botón "Restablecer Contraseña"
- ✅ Mensaje de advertencia visible
- ✅ Tiempo de expiración mencionado

---

### 4. Email de Contraseña Cambiada

**Trigger**: Contraseña modificada exitosamente  
**Remitente**: `noreply@verifactu.business`  
**Contenido**:
- Confirmación del cambio
- Fecha y hora
- Alerta de seguridad
- Contacto de emergencia

**Datos de prueba**:
```javascript
{
  email: "expertestudiospro@gmail.com",
  userName: "Usuario Test"
}
```

**Preview**: Verifica que:
- ✅ Mensaje de confirmación claro
- ✅ Email de contacto de emergencia visible
- ✅ Diseño con énfasis en seguridad

---

### 5. Email de Invitación a Equipo

**Trigger**: Usuario invita a colaborador  
**Remitente**: `noreply@verifactu.business`  
**Contenido**:
- Nombre del invitador
- Empresa destino
- Rol asignado
- Botón de aceptación

**Datos de prueba**:
```javascript
{
  inviteeEmail: "expertestudiospro@gmail.com",
  inviterName: "Admin Test",
  companyName: "Empresa Demo S.L.",
  acceptLink: "http://localhost:3000/accept-invite?token=invite_token_12345",
  role: "Contador"
}
```

**Preview**: Verifica que:
- ✅ Nombre del invitador visible
- ✅ Nombre de empresa correcto
- ✅ Rol claramente indicado
- ✅ Botón "Aceptar Invitación"

---

## ✅ Checklist de Verificación

Antes de testear, asegúrate de:

### Configuración
- [ ] `RESEND_API_KEY` configurado en `.env.local`
- [ ] Servidor de desarrollo corriendo (`pnpm dev`)
- [ ] Puerto 3000 disponible
- [ ] Dominio verificado en Resend Dashboard

### Email de Prueba
- [ ] Email válido: `expertestudiospro@gmail.com`
- [ ] Acceso a bandeja de entrada
- [ ] Revisar carpeta de spam si no llega

### Testing UI
- [ ] Acceder a http://localhost:3000/test/emails
- [ ] Seleccionar tipo de email
- [ ] Click en "Enviar"
- [ ] Verificar respuesta exitosa
- [ ] Confirmar recepción en bandeja

### Validación Visual
- [ ] Logo de Verifactu carga correctamente
- [ ] Diseño responsive en móvil
- [ ] Botones funcionan (no hacer click real en testing)
- [ ] Links formateados correctamente
- [ ] Firma con `soporte@verifactu.business`
- [ ] Colores corporativos correctos

---

## 🔍 Logs y Debugging

### Ver Logs en Consola

Los logs aparecerán en la terminal donde corre `pnpm dev`:

```bash
[📧 TEST] Sending all email(s) to expertestudiospro@gmail.com
[✅ TEST] verification: Sent
[✅ TEST] welcome: Sent
[✅ TEST] password-reset: Sent
[✅ TEST] password-changed: Sent
[✅ TEST] team-invite: Sent
```

### Errores Comunes

#### Error: "RESEND_API_KEY not configured"
**Solución**: Añadir la API key a `.env.local`

```bash
RESEND_API_KEY=re_BK6kKjAd_34XYNfwf6qkHC7FrQQb64gKA
```

#### Error: "Domain not verified"
**Solución**: Verificar dominio en [Resend Dashboard](https://resend.com/domains)

#### Email no llega
**Verificar**:
1. ✅ Carpeta de spam
2. ✅ Email correcto
3. ✅ Logs en consola muestran éxito
4. ✅ Resend Dashboard → Emails → Ver estado

#### Error: "Test endpoint not available in production"
**Solución**: Este endpoint solo funciona con `NODE_ENV=development`

---

## 🎨 Personalización de Pruebas

### Cambiar Email de Prueba

En el código o UI, reemplaza:
```javascript
testEmail: "tu-email@ejemplo.com"
```

### Cambiar Datos de Usuario

Edita [route.ts](../apps/app/app/api/test/emails/route.ts):

```typescript
userName: "Tu Nombre",
companyName: "Tu Empresa S.L.",
inviterName: "Nombre Invitador"
```

### Cambiar Links

Los links de prueba usan `http://localhost:3000`:
- `/verify?token=...`
- `/reset-password?token=...`
- `/accept-invite?token=...`

---

## 📊 Ejemplo de Respuesta Exitosa

```json
{
  "success": true,
  "message": "5/5 emails sent successfully",
  "results": {
    "verification": {
      "success": true,
      "messageId": "abc123"
    },
    "welcome": {
      "success": true,
      "messageId": "def456"
    },
    "password-reset": {
      "success": true,
      "messageId": "ghi789"
    },
    "password-changed": {
      "success": true,
      "messageId": "jkl012"
    },
    "team-invite": {
      "success": true,
      "messageId": "mno345"
    }
  },
  "testEmail": "expertestudiospro@gmail.com"
}
```

---

## 🚨 Seguridad

**Importante**: Este endpoint está protegido y:

- ✅ Solo funciona en `NODE_ENV=development`
- ❌ Bloqueado en producción (403 Forbidden)
- ⚠️ No exponer en staging público

---

## 📚 Referencias

- [Resend Docs](https://resend.com/docs)
- [Email Templates](../apps/landing/emails/)
- [Email Service](../apps/landing/lib/email/emailService.ts)
- [Plantillas HTML](../apps/landing/emails/)

---

## 🎯 Próximos Pasos

Después de validar todos los emails:

1. ✅ Probar flujo real de registro
2. ✅ Verificar que los emails llegan en producción
3. ✅ Configurar webhook de Resend para soporte
4. ✅ Implementar tracking de apertura (opcional)
5. ✅ A/B testing de asuntos (opcional)
