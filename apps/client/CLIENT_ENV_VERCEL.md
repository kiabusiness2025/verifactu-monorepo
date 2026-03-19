# Variables de Entorno — proyecto `verifactu-client` en Vercel

⚠️ **No incluyas secretos reales en este archivo.**  
Este archivo es una plantilla. Los valores reales están en el gestor de secretos del equipo.

Importa este bloque en: **Vercel → verifactu-client → Settings → Environment Variables**  
Marca todas las variables para: ✅ Production ✅ Preview ✅ Development

```env
# ============================================================
# DOMINIO DEL PROYECTO
# ============================================================
NEXT_PUBLIC_APP_URL=https://client.verifactu.business
NEXT_PUBLIC_LANDING_URL=https://verifactu.business
NEXT_PUBLIC_SITE_URL=https://verifactu.business
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@verifactu.business

# ============================================================
# SESIÓN (compartida con apps/app a través de .verifactu.business)
# ============================================================
SESSION_SECRET=replace-with-same-secret-as-apps-app
SESSION_COOKIE_DOMAIN=.verifactu.business
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none

# ============================================================
# BASE DE DATOS (misma BD que el resto de apps)
# ============================================================
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require
PRISMA_DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=replace-with-api-key

# ============================================================
# FIREBASE (cliente) — mismo proyecto Firebase
# ============================================================
NEXT_PUBLIC_FIREBASE_API_KEY=replace-with-firebase-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=verifactu-business.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=verifactu-business.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=replace-with-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=replace-with-app-id

# ============================================================
# FIREBASE (admin / servidor) — misma cuenta de servicio
# ============================================================
FIREBASE_ADMIN_PROJECT_ID=verifactu-business
FIREBASE_ADMIN_CLIENT_EMAIL=replace-with-service-account-email
FIREBASE_ADMIN_PRIVATE_KEY=replace-with-private-key

# ============================================================
# ORGANIZACIÓN (usada en documentos y emails)
# ============================================================
ORGANIZATION_NAME=Expert Estudios Profesionales, SLU
ORGANIZATION_CIF=B44991776
ORGANIZATION_ADDRESS=C/ Pintor Agrassot, 19 - 03110 Mutxamel (Alicante)
```

---

## Variables opcionales (añade solo si las activas en client)

```env
# Resend (emails transaccionales)
RESEND_API_KEY=replace-with-resend-key
RESEND_FROM=Verifactu Business <no-reply@verifactu.business>

# Stripe (si client gestiona pagos directamente)
STRIPE_SECRET_KEY=replace-with-stripe-key
STRIPE_WEBHOOK_SECRET=replace-with-stripe-webhook-secret
```

---

## Notas importantes

### SESSION_SECRET
Debe ser **exactamente el mismo valor** que `SESSION_SECRET` en `apps/app`.  
Así la cookie `__session` firmada por landing es válida también en `client.verifactu.business`.

### Firebase — dominio autorizado
Añade `client.verifactu.business` en:  
**Firebase Console → Authentication → Settings → Authorized domains**

### NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Mantén el valor `verifactu-business.firebaseapp.com` (no cambies a `client.verifactu.business`).  
Cambiar esto rompería el flujo OAuth de Google.

### PRISMA_DATABASE_URL vs DATABASE_URL
- `DATABASE_URL`: conexión directa a PostgreSQL (usada por migraciones y scripts locales).
- `PRISMA_DATABASE_URL`: conexión vía Prisma Accelerate (usada por el runtime en Vercel).  
  Si no usas Accelerate, pon el mismo valor que `DATABASE_URL`.
