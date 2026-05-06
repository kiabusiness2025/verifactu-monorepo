# Holded MCP Mobile OAuth Fix Plan

**Fecha:** 2026-05-04
**Estado:** Plan validado, implementación pendiente
**Bloqueante:** ChatGPT mobile no acepta Bearer custom; OAuth con Firebase falla en iOS in-app browser

---

## 🔍 Hallazgo crítico

ChatGPT mobile **solo soporta OAuth** para conectores. No expone campo Bearer/API-key. Por tanto la estrategia PAT que ya construimos **no resuelve mobile**.

El bloqueo real es que el flujo OAuth actual pasa por `/auth/holded` con login Firebase, que rompe en iOS in-app browser por aislamiento de IndexedDB/localStorage (storage partitioning).

## 🎯 Solución propuesta

Reemplazar la página intermedia de Firebase con un **form self-contained** que funciona en iOS in-app browser:

```
ChatGPT mobile
    ↓
/oauth/authorize (sin cambios)
    ↓
/auth/holded-direct (NUEVO)
    Form simple: email + API key Holded + T&C
    ↓ POST /api/auth/holded-direct (NUEVO)
    Backend:
      1. probeAccountingApiConnection(apiKey)
      2. Upsert User (authProvider='HOLDED_DIRECT')
      3. Upsert Tenant + Membership + ExternalConnection
      4. signSessionToken + cookie .verifactu.business
      5. Return redirect URL
    ↓
/oauth/authorize lee cookie + emite OAuth code
    ↓
ChatGPT recibe code → exchange → CONECTADO ✅
```

## 📋 Archivos a crear / modificar

### 1. Endpoint backend (NUEVO)

**Path:** `apps/holded/app/api/auth/holded-direct/route.ts`

```ts
import { encryptIntegrationSecret } from '@/lib/integrations/secretCrypto';
import { probeAccountingApiConnection } from '@/lib/integrations/accounting';
import { signSessionToken, readSessionSecret } from '@/lib/session-tokens';
import { buildSessionCookieOptions } from '@/lib/session-cookies';
import { sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';
import { prisma } from '@verifactu/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, apiKey, acceptedTerms, acceptedPrivacy, next } = body;

  // 1. Validate inputs
  if (!email?.trim() || !apiKey?.trim()) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }
  if (!acceptedTerms || !acceptedPrivacy) {
    return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED' }, { status: 400 });
  }

  // 2. Validate API key against Holded
  const probe = await probeAccountingApiConnection(apiKey, { profile: 'dashboard' });
  if (!probe.ok) {
    return NextResponse.json(
      { error: 'INVALID_API_KEY', missingCapabilities: probe.missingCapabilities },
      { status: 400 }
    );
  }

  // 3. Upsert User + Tenant + Connection in transaction
  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findFirst({ where: { email } });
    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          name: email.split('@')[0],
          authProvider: 'HOLDED_DIRECT', // requires enum extension
          authSubject: `holded:${email}`,
        },
      });
    }

    let membership = await tx.membership.findFirst({
      where: { userId: user.id, status: 'active' },
    });
    let tenantId: string;
    if (!membership) {
      const tenant = await tx.tenant.create({
        data: {
          name: `${user.name ?? email}`,
          legalName: null,
        },
      });
      await tx.membership.create({
        data: { tenantId: tenant.id, userId: user.id, role: 'owner', status: 'active' },
      });
      tenantId = tenant.id;
    } else {
      tenantId = membership.tenantId;
    }

    await tx.externalConnection.upsert({
      where: {
        tenantId_provider_channelKey: {
          tenantId,
          provider: 'holded',
          channelKey: 'mobile',
        },
      },
      create: {
        tenantId,
        provider: 'holded',
        channelKey: 'mobile',
        apiKeyEnc: encryptIntegrationSecret(apiKey),
        connectionStatus: 'connected',
        connectedAt: new Date(),
        connectedByUserId: user.id,
        legalTermsAcceptedAt: new Date(),
        legalPrivacyAcceptedAt: new Date(),
        legalAcceptanceVersion: 'v1.0',
      },
      update: {
        apiKeyEnc: encryptIntegrationSecret(apiKey),
        connectionStatus: 'connected',
        connectedAt: new Date(),
      },
    });

    return { userId: user.id, email: user.email, tenantId };
  });

  // 4. Mint session cookie (server-side)
  const token = await signSessionToken({
    payload: {
      uid: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      role: 'owner',
      roles: ['owner'],
      tenants: [result.tenantId],
      ver: 1,
      rememberDevice: true,
    },
    secret: readSessionSecret(),
    expiresIn: '30d',
  });

  const cookieOpts = buildSessionCookieOptions({
    domainEnv: process.env.SESSION_COOKIE_DOMAIN || '.verifactu.business',
    secureEnv: process.env.SESSION_COOKIE_SECURE || 'true',
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || 'none',
    value: token,
    maxAgeSeconds: 60 * 60 * 24 * 30,
  });

  // 5. Return redirect URL (sanitized)
  const redirectUrl = sanitizeHoldedReturnTarget(next, '/dashboard');

  const response = NextResponse.json({ ok: true, redirectUrl });
  response.cookies.set(cookieOpts);
  return response;
}
```

### 2. Página frontend (NUEVA)

**Path:** `apps/holded/app/auth/holded-direct/page.tsx`

Form con: email, API key, T&C checkbox, botón Continuar. POST a `/api/auth/holded-direct`. Redirect a `redirectUrl` recibido. Estilo idéntico al de `/auth/holded` actual pero sin Firebase.

### 3. Modificar OAuth authorize

**Path:** `apps/app/app/oauth/authorize/route.ts`

Cambiar el redirect a `/auth/holded` por `/auth/holded-direct` cuando no hay sesión. O añadir query `?direct=1` al actual y que `/auth/holded` redirija a `/auth/holded-direct` si lo recibe.

### 4. Schema Prisma

**Path:** `packages/db/prisma/schema.prisma`

Añadir valor `HOLDED_DIRECT` al enum `AuthProvider`:

```prisma
enum AuthProvider {
  FIREBASE
  GOOGLE
  HOLDED_DIRECT  // NEW
}
```

## ⚠️ Riesgos

1. **iOS ITP cookie partitioning**: aunque el cookie se set con SameSite=None, iOS puede particionarlo dentro del in-app browser. Si esto ocurre, /oauth/authorize no leerá la cookie. Verificar con Vercel logs.

2. **Open redirect en `next` param**: usar `sanitizeHoldedReturnTarget` que ya existe.

3. **Spam de cuentas**: cualquiera con un API key Holded válida puede crear User+Tenant. Mitigación: rate limit por IP + email verification opcional (Resend) tras primer login.

4. **Audit / governance**: el ExternalConnection con channelKey='mobile' debe activar las mismas alertas (`buildHoldedConnectedEmail`, `buildHoldedDisconnectedEmail`) que el flujo dashboard.

## 🚦 Plan de validación tras implementar

1. **Local**: probar el form con API key de demo tenant, ver que User+Tenant+Connection se crean
2. **Deploy**: push a main, esperar Vercel
3. **Mobile test crítico**:
   - Abrir ChatGPT mobile
   - Add connector → URL `https://holded.verifactu.business/api/mcp/holded`
   - Choose OAuth (única opción disponible)
   - In-app browser abre `/auth/holded-direct`
   - Pegar email + API key + check T&C
   - Click Continuar
   - ✅ Si redirige y conecta → SOLUCIÓN VALIDADA
   - ❌ Si vuelve a "Connect" → cookie partitioning, necesitamos device code flow

## ✅ Lo que ya está hecho (no se tira)

- `HoldedMcpPersonalAccessToken` schema + migration → útil para Claude desktop, scripts, integraciones backend
- `holdedPatStore.ts` (createPat/verifyPat/revokePat/listPatsForTenant) → útil
- MCP route acepta Bearer `hldmcp_*` además de OAuth → útil
- 3 tools nuevos (`holded_list_crm_funnels`, `holded_list_leads`, `holded_list_time_records`) → benefician todos los canales
- Preset `claude_parity` → expone 29 tools cuando el cliente usa PAT con esos scopes
- Script CLI `create-holded-pat.ts` → útil para soporte interno

## 🎬 Acción inmediata

1. Lee este plan
2. Decide si implementar tú directamente o en sesión nueva con Claude
3. Aplica migración Prisma de F1 igualmente (PAT infra) — no rompe nada
4. Cuando vayas a hacer el flujo `/auth/holded-direct`, esta doc tiene el código casi completo
