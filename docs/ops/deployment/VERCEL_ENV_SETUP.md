# Configuración Variables de Entorno en Vercel

## Generar Secreto Compartido

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y úsalo como `SESSION_SECRET` en **ambos proyectos** (landing y app).

> ⚠️ **Importante**: Debe ser el **mismo valor** en ambos proyectos para que la sesión cross-dominio funcione.

---

## Proyecto: `verifactu-landing` (verifactu.business)

### Settings → Environment Variables

Añadir las siguientes variables con scope **Production + Preview + Development**:

#### Firebase Client SDK

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<tu firebase api key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<tu sender id>
NEXT_PUBLIC_FIREBASE_APP_ID=<tu app id>
```

#### Sesión Cross-Dominio

```bash
SESSION_SECRET=<generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
```

#### Firebase Admin SDK

**Obtener de**: Firebase Console → Project Settings → Service Accounts → Generate new private key

```bash
FIREBASE_ADMIN_PROJECT_ID=tu-proyecto-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> 📝 **Nota**: El `PRIVATE_KEY` debe tener `\n` escapados (no saltos de línea reales).

#### Google AI (Gemini)

```bash
GOOGLE_AI_API_KEY=<tu google ai api key>
```

#### OpenAI (GPT-4 para consultas complejas)

**Nota**: Ya existe como `ISAAK_API_KEY` en Vercel.

Añadir alias para sistema híbrido:

```bash
OPENAI_API_KEY=<valor de ISAAK_API_KEY>
```

O bien actualizar el código para usar `process.env.ISAAK_API_KEY` en lugar de `OPENAI_API_KEY`.

#### Stripe

```bash
STRIPE_SECRET_KEY=<tu stripe sk_live_...>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<tu stripe pk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_... generado en Stripe Dashboard>
```

#### Resend Email

```bash
RESEND_API_KEY=<tu resend api key>
RESEND_FROM=Verifactu Business <no-reply@verifactu.business>
```

#### Organización

```bash
ORGANIZATION_CIF=B44991776
ORGANIZATION_NAME="Expert Estudios Profesionales, SLU"
ORGANIZATION_ADDRESS="C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)"
NEXT_PUBLIC_SITE_URL=https://verifactu.business
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@verifactu.business
```

---

## Proyecto: `verifactu-app` (app.verifactu.business)

### Settings → Environment Variables

Añadir las siguientes variables con scope **Production + Preview + Development**:

#### Firebase Client SDK

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<tu firebase api key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<tu sender id>
NEXT_PUBLIC_FIREBASE_APP_ID=<tu app id>
```

#### Sesión Cross-Dominio

```bash
SESSION_SECRET=<mismo valor que en landing>
NEXT_PUBLIC_LANDING_URL=https://verifactu.business
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
```

---

## Verificación

### Landing (verifactu.business)

```bash
# Probar que Firebase Admin funciona
curl -X POST https://verifactu.business/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"idToken": "..."}'

# Debería crear cookie __session
```

### App (app.verifactu.business)

```bash
# Probar que lee la cookie __session
curl https://app.verifactu.business/dashboard \
  -H "Cookie: __session=..."

# Debería autenticar al usuario
```

---

## Checklist de Deploy

- [ ] **Landing**: SESSION_SECRET añadido en Vercel
- [ ] **Landing**: Firebase Admin (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) añadido
- [ ] **Landing**: GOOGLE_AI_API_KEY añadido
- [ ] **Landing**: OPENAI_API_KEY (o usar ISAAK_API_KEY) añadido
- [ ] **App**: SESSION_SECRET añadido (mismo valor que landing)
- [ ] **App**: Firebase Client SDK añadido
- [ ] Redeploy ambos proyectos en Vercel
- [ ] Probar login en landing → redirect a app → mantiene sesión
- [ ] Probar logout en app → limpia cookie en landing

---

## Solución de Problemas

### Error: "Invalid SESSION_SECRET"

- Verificar que `SESSION_SECRET` tiene el **mismo valor** en landing y app
- Verificar que tiene 64 caracteres hexadecimales

### Error: "Firebase Admin initialization failed"

- Verificar que `FIREBASE_ADMIN_PRIVATE_KEY` tiene `\n` escapados
- Formato correcto: `"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"`
- NO usar saltos de línea reales en Vercel UI

### Error: "Cookie \_\_session not set"

- Verificar que dominio es `.verifactu.business` (con punto inicial)
- Verificar HTTPS en producción (required para cookies cross-domain)
- Verificar que `SameSite=None; Secure` está configurado

### Sistema Híbrido no usa GPT-4

- Verificar que `OPENAI_API_KEY` está configurado (o usar `ISAAK_API_KEY`)
- Revisar logs: debería mostrar `[Isaak Chat] Using model: gpt-4` o `gemini-flash`
- Si falla GPT-4, automáticamente usa Gemini como fallback
