# Isaak Self-Service Signup — Implementation Spec

**Fecha:** 2026-05-04
**Estado:** Frontend (pricing + signup) completo. Backend pendiente.
**Decisión validada:** Self-service con trial 14 días sin tarjeta.

---

## 1. Estado actual

### Hecho ✅

- `/pricing` (apps/isaak/app/pricing/page.tsx) — 4 planes con FAQ y CTA secundario
- `/signup?plan=pro` (apps/isaak/app/signup/page.tsx) — landing pre-auth con copy específico por plan
- Branch business → CTA a `/support?topic=isaak_business` (no entra al flow self-service)
- CTA en `/signup` redirige a `${LANDING_URL}/auth/isaak?signup=1&plan=pro&next=${ISAAK_URL}/onboarding/holded`
- `TenantSubscription` model ya tiene `trialEndsAt`, `status`, `stripeCustomerId`, `stripeSubscriptionId`
- `loadBillingData()` y `createBillingCheckoutUrl()` ya operativos en `apps/isaak/app/lib/settings.ts`
- `/onboarding/holded` ya existe y conecta Holded vía OAuth

### Pendiente ❌

1. **API route `/api/auth/signup`** en el dominio de auth (probablemente `apps/landing` o equivalente)
2. **Webhook Stripe** `/api/webhooks/stripe` para subscription lifecycle
3. **Seed de planes** Free + Pro Trial en BD
4. **Email de verificación** (Resend) post-signup
5. **Wrapper `/onboarding`** que enrute step 1 (perfil empresa) → step 2 (Holded) → step 3 (success)

---

## 2. Flujo end-to-end objetivo

```
Visitor                                                              Isaak/Auth/Stripe
  |
  |  GET /pricing                                              ─→    isaak.verifactu.business
  |  click "Empezar trial 14 dias" (Pro)                       ─→    GET /signup?plan=pro
  |  click "Crear cuenta y empezar trial"                      ─→    landing.verifactu.business
  |                                                                  /auth/isaak?signup=1&plan=pro&next=...
  |  rellena email + password + nombre empresa                 ─→    POST /api/auth/signup
  |                                                                       │
  |                                                                       ├─ create User
  |                                                                       ├─ create Tenant
  |                                                                       ├─ create TenantSubscription:
  |                                                                       │     planId: pro
  |                                                                       │     status: 'trial'
  |                                                                       │     trialEndsAt: now() + 14d
  |                                                                       │     queriesUsedToday: 0
  |                                                                       │     dailyQueryLimit: 999 (sin limite trial)
  |                                                                       ├─ send verification email (Resend)
  |                                                                       └─ set session cookie + redirect
  |
  |  email "Verifica tu cuenta"                                ─→    click link
  |                                                                  GET /api/auth/verify?token=...
  |                                                                  → set User.emailVerified
  |                                                                  → redirect a next= URL
  |
  |  GET /onboarding/holded                                    ─→    isaak.verifactu.business
  |  click "Conectar Holded"                                   ─→    holded.verifactu.business
  |                                                                  /auth/holded?source=isaak_onboarding
  |  OAuth Holded                                              ─→    callback guarda HoldedConnection
  |                                                                  redirect a /chat
  |
  |  /chat (primera sesion)                                    ─→    isaak operativo con Holded conectado
  |                                                                  TrialBanner visible si <= 3 dias
  |
  |  Dia 11: email "Tu trial termina en 3 dias"                ─→    Resend
  |  Dia 14: email "Tu trial termino. Activar Pro?"            ─→    CTA al Stripe portal
  |  Si activa: createBillingCheckoutUrl() → Stripe Checkout   ─→    on success, webhook actualiza
  |                                                                  TenantSubscription.status = 'active'
  |  Si no activa: status = 'expired', dailyQueryLimit = 5     ─→    free tier reducido
```

---

## 3. Cambios concretos

### 3.1 API route: `POST /api/auth/signup`

**Ubicación:** `apps/landing/app/api/auth/signup/route.ts` (asumiendo que landing.verifactu.business es donde está NextAuth)

**Body:**

```ts
{
  email: string;
  password: string;
  companyName: string;
  plan: 'pro' | 'free';   // 'pro' activa trial 14d
  source?: string;          // 'isaak_signup_pro', 'conector_holded', etc.
}
```

**Lógica:**

```ts
import { prisma } from '@verifactu/db';
import { hash } from 'bcrypt';
import { sendVerificationEmail } from '@/lib/emails';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, companyName, plan, source } = SignupSchema.parse(body);

  // 1. Check duplicate
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });

  // 2. Get plan from DB
  const planRecord = await prisma.plan.findUnique({
    where: { code: plan === 'pro' ? 'trial_14d' : 'free' },
  });
  if (!planRecord) return NextResponse.json({ error: 'PLAN_NOT_FOUND' }, { status: 500 });

  // 3. Create User + Tenant + Subscription in single transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: await hash(password, 12),
        emailVerificationToken: crypto.randomUUID(),
      },
    });
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        users: { create: { userId: user.id, role: 'owner' } },
      },
    });
    const trialEndsAt = plan === 'pro' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;
    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: planRecord.id,
        status: plan === 'pro' ? 'trial' : 'active',
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        dailyQueryLimit: plan === 'pro' ? 999 : 5,
      },
    });
    return { user, tenant, subscription };
  });

  // 4. Send verification email
  await sendVerificationEmail({
    to: email,
    token: result.user.emailVerificationToken,
    plan,
    source,
  });

  // 5. Set session cookie + return next URL
  const sessionToken = await createSession({ userId: result.user.id, tenantId: result.tenant.id });
  cookies().set('verifactu_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });

  return NextResponse.json({
    ok: true,
    redirect: plan === 'pro' ? '/onboarding/holded?source=signup_pro' : '/chat?source=signup_free',
  });
}
```

### 3.2 Seed de planes

**Ubicación:** `packages/db/prisma/seed.ts` (añadir bloque)

```ts
await prisma.plan.upsert({
  where: { code: 'free' },
  create: {
    code: 'free',
    name: 'Plan gratuito',
    fixedMonthly: 0,
    variableRate: 0,
    maxInvoicesPerMonth: 5,
  },
  update: {},
});

await prisma.plan.upsert({
  where: { code: 'trial_14d' },
  create: {
    code: 'trial_14d',
    name: 'Isaak Pro (Trial 14 dias)',
    fixedMonthly: 49,
    variableRate: 0,
    maxInvoicesPerMonth: null, // ilimitado durante trial
  },
  update: {},
});

await prisma.plan.upsert({
  where: { code: 'pro' },
  create: {
    code: 'pro',
    name: 'Isaak Pro',
    fixedMonthly: 49,
    variableRate: 0,
    maxInvoicesPerMonth: null,
  },
  update: {},
});

await prisma.plan.upsert({
  where: { code: 'business' },
  create: {
    code: 'business',
    name: 'Isaak Business',
    fixedMonthly: 149,
    variableRate: 0,
    maxInvoicesPerMonth: null,
  },
  update: {},
});
```

Run: `pnpm --filter @verifactu/db db:seed`

### 3.3 Webhook Stripe

**Ubicación:** `apps/landing/app/api/webhooks/stripe/route.ts` (probablemente ya hay esqueleto — auditar)

**Eventos a manejar:**

- `customer.subscription.created` → asegurar TenantSubscription existe con stripeSubscriptionId
- `customer.subscription.updated` → sincronizar status (`trialing|active|past_due|canceled`)
- `customer.subscription.deleted` → status='canceled', cancelAtPeriodEnd=true
- `customer.subscription.trial_will_end` → enviar email "Tu trial termina en 3 dias" (Stripe envía 3d antes)
- `invoice.payment_failed` → status='past_due', enviar email recordatorio
- `invoice.payment_succeeded` → status='active'

**Pseudo:**

```ts
const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

switch (event.type) {
  case 'customer.subscription.updated':
    await prisma.tenantSubscription.update({
      where: { stripeSubscriptionId: event.data.object.id },
      data: {
        status: mapStripeStatus(event.data.object.status),
        stripeStatus: event.data.object.status,
        currentPeriodStart: new Date(event.data.object.current_period_start * 1000),
        currentPeriodEnd: new Date(event.data.object.current_period_end * 1000),
        cancelAtPeriodEnd: event.data.object.cancel_at_period_end,
      },
    });
    break;
  // ...
}
```

### 3.4 Email de verificación

**Reutilizar:** `apps/landing/emails/` ya tiene `EmailContainer`, `EmailHeader`, `EmailFooter`, `CTAButton` (marca Verifactu #0d2b4a/#0060F0).

**Nuevo template:** `apps/landing/emails/IsaakSignupVerification.tsx`

```tsx
export const IsaakSignupVerification = ({ name, verifyUrl, plan }: Props) => (
  <EmailContainer>
    <EmailHeader />
    <h1>Hola {name},</h1>
    <p>Solo un paso mas para activar tu cuenta de Isaak{plan === 'pro' ? ' Pro' : ''}.</p>
    <CTAButton href={verifyUrl}>Verificar mi email</CTAButton>
    <p style={{ fontSize: 12, color: '#64748b' }}>Si no creaste esta cuenta, ignora este email.</p>
    <EmailFooter />
  </EmailContainer>
);
```

### 3.5 Onboarding wrapper

**Opcional v1.** El `/onboarding/holded` actual ya es suficiente para v1. Puede crecer a:

- `/onboarding` (step 1: perfil empresa: NIF, sector)
- `/onboarding/holded` (step 2: conectar Holded — ya existe)
- `/onboarding/done` (step 3: success → /chat)

Diferir hasta tener feedback de los primeros 10 signups.

---

## 4. Variables de entorno requeridas

Verificar en `.env` del entorno de production (Vercel):

```bash
# Auth
NEXT_PUBLIC_LANDING_URL=https://verifactu.business
NEXT_PUBLIC_ISAAK_SITE_URL=https://isaak.verifactu.business
SESSION_SECRET=<random 32 bytes>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ISAAK_MONTHLY=price_xxx  # Pro plan
STRIPE_PRICE_ISAAK_BUSINESS_MONTHLY=price_yyy  # Business plan (post-sales)

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Isaak <hola@isaak.verifactu.business>
RESEND_REPLY_TO=soporte@verifactu.business
```

---

## 5. Tests mínimos

Antes de exponer públicamente:

1. **E2E happy path** (Playwright): /pricing → /signup → submit form → email recibido → click verify → /onboarding/holded → conectar Holded → /chat
2. **Stripe webhook**: simular `customer.subscription.trial_will_end` y verificar email enviado
3. **Idempotencia signup**: dos POSTs con mismo email → segundo devuelve 409
4. **Trial expiry**: forzar `trialEndsAt = ayer` y verificar que `enforceQuota` (cuando exista) bloquea acción

---

## 6. Roadmap de implementación

| Sprint          | Trabajo                                             | Prioridad | Estimación |
| --------------- | --------------------------------------------------- | --------- | ---------- |
| **0** (hoy)     | Frontend pricing + signup ✅                        | DONE      | 1 h        |
| **1**           | Seed planes en BD + auditar API auth existente      | P0        | 1 h        |
| **2**           | API route /api/auth/signup + email verificación     | P0        | 4-6 h      |
| **3**           | Webhook Stripe + sincronización subscription        | P0        | 3-4 h      |
| **4**           | Plan B Schema (enforceQuota middleware en SHADOW)   | P1        | 4-6 h      |
| **5**           | E2E test + go-live primeros 10 signups beta         | P1        | 2-3 h      |
| **6** (semanas) | Onboarding wrapper multi-step + email drip campaign | P2        | 1-2 días   |

**Total estimado para self-service operativo:** 15-22 h de trabajo (~3 días de dev focused).

---

## 7. Decisiones a validar antes de codear

1. **¿Dónde vive `/api/auth/signup`?** — `apps/landing` (asumido) vs `apps/isaak` (más cercano al UI)
2. **Verificación email obligatoria antes del trial?** — recomendado SÍ (evita bots/abuso)
3. **¿Pasamos por Stripe Checkout para Pro o solo creamos subscription en backend sin tarjeta?** — recomendado backend-only (sin tarjeta) durante trial; Stripe Checkout solo cuando upgrade real al final del trial
4. **Free plan: 5 queries/día o no permitir nada?** — mejor 5/día para mantener engagement post-trial
5. **¿Mantener `/auth` legacy redirect a `/signup`?** — sí, hacer `/auth` redirect a `/signup` si no hay session (mejor UX)

---

## 8. Riesgos identificados

- **Auth dispersada en 2 dominios** (landing + isaak): el cookie de session debe ser `.verifactu.business` (sin subdominio) para compartirse. Confirmar config NextAuth.
- **Stripe webhook puede fallar por orden de eventos**: implementar idempotencia con `event.id` en tabla `processed_webhooks`.
- **TenantSubscription.dailyQueryLimit no tiene reset cron**: añadir cron diario que resetee `queriesUsedToday = 0`.
- **Multi-tenant por email**: un usuario puede pertenecer a varios tenants vía Membership. UI de signup asume 1 tenant por user — está bien para MVP.
