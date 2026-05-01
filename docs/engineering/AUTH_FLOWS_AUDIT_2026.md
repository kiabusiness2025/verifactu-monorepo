# Auditoría de Flujos de Auth — Verifactu Business 2026

> Última actualización: Enero 2026  
> Estado: **Activo** — actualizar al modificar cualquier flujo de auth

---

## 1. Contexto

El sistema tiene tres canales de usuarios con orígenes distintos:

| Canal            | Origen                                 | Auth provider                                   | Flujo de login                                    |
| ---------------- | -------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| **Holded**       | Usuarios que conectaron via Holded ERP | Firebase (email + Holded OAuth)                 | `verifactu.business/auth/holded` → cookie session |
| **Isaak nativo** | Usuarios que se registran directamente | Firebase (email magic link / password / Google) | `verifactu.business/auth/isaak` → cookie session  |
| **Admin**        | Equipo interno                         | Firebase email/password                         | `admin.verifactu.business/auth`                   |

---

## 2. Flujo Isaak Nativo (NUEVO — Enero 2026)

### 2.1 Registro / Primer acceso

```
Usuario → verifactu.business/auth/isaak
         ↓
   [Tab: Magic link / Contraseña / Google]
         ↓
   Magic link seleccionado:
         ↓
   POST /api/auth/magic-link  (landing)
         ├─ Rate limit: 5 req/hora por IP
         ├─ Firebase Admin: generateSignInWithEmailLink(email, { url: continueUrl })
         └─ Resend: email HTML + text con el enlace
         ↓
   Usuario abre enlace en email
         ↓
   verifactu.business/auth/isaak?apiKey=...&oobCode=...&mode=signIn
         ↓
   Auto-verify: isSignInWithEmailLink → signInWithEmailLink(auth, email, link)
         ↓
   idToken obtenido → POST /api/auth/session (mint cookie)
         ↓
   Redirect → ?next param || /dashboard/isaak
```

### 2.2 Welcome email (solo en registro)

```
Login/Registro → POST /api/v1/auth/sync-user (apps/app)
                    ↓
            existingUser = null → created = true
                    ↓
            sendIsaakWelcomeEmail({ email, name }) — best-effort, no bloquea
                    ↓
            Resend: email de bienvenida con 3 pasos de onboarding + CTA
```

**Archivos clave:**

- `apps/landing/app/auth/isaak/page.tsx` — Página de login
- `apps/landing/app/api/auth/magic-link/route.ts` — API magic link
- `apps/app/app/api/auth/sync-user/route.ts` — Hook de registro
- `apps/app/lib/isaak-welcome.ts` — Template welcome email

---

## 3. Flujo Holded (EXISTENTE)

```
Usuario en apps/isaak → clic "Acceder"
         ↓
   buildHoldedAuthUrl() → holded.verifactu.business/auth/holded
         ↓
   Holded OAuth → callback con token Holded
         ↓
   POST /api/auth/holded-callback → Firebase custom token
         ↓
   signInWithCustomToken → idToken
         ↓
   POST /api/auth/session → cookie
         ↓
   Redirect a apps/isaak
```

**Estado:** Funcional pero en proceso de migración hacia auth nativa.

---

## 4. Flujo Admin

```
admin.verifactu.business/auth
         ↓
   Email + contraseña
         ↓
   signInWithEmailAndPassword (Firebase client)
         ↓
   idToken → POST /api/auth/session (admin)
         ↓
   requireAdminContext verifica rol en Prisma
```

---

## 5. Sesión y Verificación

### Mint de cookie (aplica a todos los flujos)

```typescript
// apps/landing/app/api/auth/session/route.ts
POST /api/auth/session
  ← { idToken: string }
  → adminAuth.verifyIdToken(idToken)
  → adminAuth.createSessionCookie(idToken, { expiresIn })
  → Set-Cookie: __session=...; HttpOnly; Secure; SameSite=Lax
```

### Verificación en rutas protegidas

```typescript
// requireTenantContext / requireAdminContext
Cookie __session → adminAuth.verifySessionCookie(cookie, true)
  → { uid, email, ... }
  → prisma.user.findFirst({ where: { authSubject: uid } })
```

---

## 6. Variables de entorno requeridas

### apps/landing

| Variable                  | Descripción                             |
| ------------------------- | --------------------------------------- |
| `FIREBASE_PROJECT_ID`     | ID del proyecto Firebase                |
| `FIREBASE_CLIENT_EMAIL`   | Service account email                   |
| `FIREBASE_PRIVATE_KEY`    | Service account private key             |
| `RESEND_API_KEY`          | API key de Resend                       |
| `RESEND_FROM_EMAIL`       | Dirección de remitente para magic link  |
| `NEXT_PUBLIC_APP_URL`     | URL de apps/app (para continueUrl)      |
| `NEXT_PUBLIC_LANDING_URL` | URL de landing (para whitelist origins) |

### apps/app

| Variable              | Descripción                               |
| --------------------- | ----------------------------------------- |
| `RESEND_API_KEY`      | API key de Resend                         |
| `RESEND_FROM`         | Dirección de remitente para welcome email |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (para links en emails) |

---

## 7. Rate Limiting

El endpoint `/api/auth/magic-link` aplica rate limiting **en memoria** (Map en el proceso Node.js):

- Máximo: 5 requests por IP por hora
- Reset automático al expirar el intervalo (1h)
- ⚠️ **Limitación**: En entornos con múltiples instancias (serverless/multi-pod), el rate limit no es compartido entre procesos. Para producción de alta escala, migrar a Redis o Upstash.

---

## 8. Problemas encontrados y resueltos

| Problema                                                               | Estado      | Solución                                                                                                 |
| ---------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `apps/isaak` auth apuntaba a Holded en lugar de auth nativa            | ✅ Resuelto | `buildHoldedAuthUrl` → `buildIsaakAuthUrl` en auth/page.tsx, settings/page.tsx, change-password/route.ts |
| No había flujo de magic link                                           | ✅ Resuelto | Nuevo endpoint + página `/auth/isaak`                                                                    |
| No había welcome email para usuarios nativos                           | ✅ Resuelto | `isaak-welcome.ts` + hook en sync-user                                                                   |
| `sync-user/route.ts` tenía código duplicado/roto por patches sucesivos | ✅ Resuelto | Reescritura del bloque POST limpio                                                                       |

---

## 9. Gaps pendientes (próximas iteraciones)

### 9.1 Flujo de desconexión / revocación de sesión

- No existe un endpoint `POST /api/auth/signout` que revoque la cookie + el token Firebase.
- **Acción necesaria**: Crear endpoint que llame `adminAuth.revokeRefreshTokens(uid)` + elimine la cookie.

### 9.2 Verificación de email

- Firebase permite marcar emails como verificados. Actualmente no se bloquea acceso a usuarios no verificados.
- **Acción necesaria**: Decidir si es necesario en flujo magic link (donde el propio click verifica).

### 9.3 ExternalConnection (conector Holded)

- La desconexión del conector Holded (`ExternalConnection`) no revoca la sesión Firebase.
- Un usuario puede perder acceso a datos Holded pero seguir con sesión activa.
- **Acción necesaria**: Al desactivar `ExternalConnection`, invalidar sesión o mostrar aviso en UI.

### 9.4 Providers OAuth adicionales (Microsoft)

- `apps/landing` tiene Microsoft OAuth pero no está integrado en `/auth/isaak`.
- **Acción necesaria**: Evaluar si añadir tab Microsoft a la página de login nativa.

### 9.5 Rate limiting distribuido

- Magic link rate limit es en memoria (ver §7).
- **Acción necesaria**: Migrar a Upstash Redis si se despliega en Vercel (serverless).

### 9.6 Logs de auth (auditoría de seguridad)

- No se registran eventos de login/logout/failed en base de datos.
- **Acción necesaria**: Añadir tabla `AuthEvent` o usar Firebase Auth logs vía Admin SDK.

---

## 10. Estructura de archivos de auth

```
apps/
  landing/
    app/
      auth/
        isaak/page.tsx           ← Login nativo Isaak (magic link / password / Google)
        holded/page.tsx          ← Login canal Holded
      api/
        auth/
          session/route.ts       ← Mint de cookie de sesión (POST)
          magic-link/route.ts    ← Envío de magic link por email (POST)
          holded-callback/       ← Callback OAuth Holded

  app/
    app/
      api/
        auth/
          sync-user/route.ts     ← Sync Firebase → Prisma + welcome email
    lib/
      isaak-welcome.ts           ← Template + send welcome email

  isaak/
    app/
      auth/page.tsx              ← Redirección a /auth/isaak (nativa)
      lib/
        isaak-navigation.ts      ← buildIsaakAuthUrl, buildHoldedAuthUrl, URLs base
      settings/page.tsx          ← Guard de sesión → buildIsaakAuthUrl
      api/
        settings/profile/
          change-password/route.ts  ← Respuesta 409 + redirect a login nativo

  admin/
    app/
      (admin)/
        layout.tsx               ← Guard de sesión admin
```

---

_Documento generado durante el rebuild de auth de Enero 2026._  
_Maintainer: equipo Verifactu Business_
