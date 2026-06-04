# Flujo OAuth 2.1 · Conectores Holded

Implementación completa del flujo OAuth 2.1 con PKCE + consent screen criptográficamente vinculado (HMAC binding V3.E), validación de redirect URIs y intersección de scopes contra preset público.

## Visión general

```
ChatGPT / Claude                Verifactu (apps/app)              Holded
       │                                │                            │
       │  GET /oauth/authorize          │                            │
       ├───────────────────────────────►│                            │
       │   client_id, redirect_uri,     │                            │
       │   PKCE challenge, scope        │                            │
       │                                │                            │
       │                                ├── 1. Validate params       │
       │                                ├── 2. Force login           │
       │                                ├── 3. Resolve tenant        │
       │                                ├── 4. Verify Holded conn    │
       │                                ├── 5. Sign consent_proof    │
       │                                │     (HMAC SESSION_SECRET)  │
       │                                │                            │
       │  302 → /auth/holded-direct     │                            │
       │◄───────────────────────────────┤                            │
       │  (login if no session)         │                            │
       │                                │                            │
       │  302 → /oauth/consent          │                            │
       │◄───────────────────────────────┤                            │
       │     ?consent_proof=HMAC        │                            │
       │                                │                            │
       │  GET /oauth/consent            │                            │
       ├───────────────────────────────►│                            │
       │  → renders scopes, T&C, DPA    │                            │
       │  → "Autorizar" link to         │                            │
       │     /oauth/authorize           │                            │
       │     ?consent_proof=<HMAC>      │                            │
       │                                │                            │
       │  GET /oauth/authorize          │                            │
       ├───────────────────────────────►│                            │
       │   ...&consent_proof=<HMAC>     │                            │
       │                                │                            │
       │                                ├── verifyConsentProof()     │
       │                                ├── intersectScopes()        │
       │                                ├── mintAuthorizationCode()  │
       │                                │                            │
       │  302 → redirect_uri?code=XXX   │                            │
       │◄───────────────────────────────┤                            │
       │                                │                            │
       │  POST /oauth/token             │                            │
       ├───────────────────────────────►│                            │
       │   grant_type=authorization_code│                            │
       │   code, code_verifier (PKCE)   │                            │
       │                                │                            │
       │                                ├── verify PKCE              │
       │                                ├── mint access_token        │
       │                                │                            │
       │  200 {access_token,token_type} │                            │
       │◄───────────────────────────────┤                            │
       │                                │                            │
       │  POST /api/mcp/holded          │                            │
       │  Authorization: Bearer XXX     │                            │
       ├───────────────────────────────►│                            │
       │  {method:"tools/call",         │                            │
       │   params:{...}}                │                            │
       │                                ├── validateBearer()         │
       │                                ├── decryptApiKey(tenantId)  │
       │                                ├── callTool()               │
       │                                │                            │
       │                                │  GET /api/invoicing/...    │
       │                                ├───────────────────────────►│
       │                                │  key: <plain api_key>      │
       │                                │  Accept-Encoding: identity │
       │                                │                            │
       │                                │  200 [...invoices]         │
       │                                │◄───────────────────────────┤
       │                                │                            │
       │  200 {result:{...}}            │                            │
       │◄───────────────────────────────┤                            │
```

## Endpoints OAuth

Todos viven en `apps/app/app/oauth/`. El conector Claude (`apps/holded-mcp`) tiene proxies ligeros que delegan al backend de apps/app — no implementan su propio OAuth.

### `GET /oauth/authorize`

Archivo: `apps/app/app/oauth/authorize/route.ts`

Validaciones en orden (`route.ts:223-279`):

1. **response_type === 'code'** (RFC 6749).
2. **client_id presente y válido** (`^[A-Za-z0-9._~-]{3,200}$`, sin `://`).
3. **redirect_uri en allowlist por origen**: solo `chatgpt.com`, `chat.openai.com`, `platform.openai.com`, `claude.ai`, `anthropic.com` (+ env extra). Path libre.
4. **PKCE obligatorio**: `code_challenge` matching `^[A-Za-z0-9_-]{43,128}$` + `code_challenge_method === 'S256'`.
5. **Scope clamp**: requested ∩ public preset. Si vacío → defaults.
6. **Force login para clientes ChatGPT** sin `holded_login_confirmed=1`.

Decisiones de branching (en orden):

```ts
if (!session) → redirect to /auth/holded-direct
if (!tenant.hasHoldedConnection) → redirect to /auth/holded-direct (paste API key)
if (!consentProofValid) → sign new consent_proof + redirect to /oauth/consent
else → mintAuthorizationCode + redirect to redirect_uri?code=XXX
```

### `GET /oauth/consent`

Archivo: `apps/holded/app/oauth/consent/page.tsx` (servido bajo `holded.verifactu.business` para mantener dominio canónico).

Renderiza:
- Logo de Holded + de la app cliente (ChatGPT/Claude).
- Scopes solicitados en lenguaje humano (mapeados en `SCOPE_DESCRIPTIONS` del fichero).
- Links a T&C, Privacidad, DPA, Soporte.
- Botones `Autorizar` (link a `/oauth/authorize?...&consent_proof=<HMAC>`) y `Cancelar` (link a `redirect_uri?error=access_denied`).

⚠ **No requiere SESSION_SECRET en apps/holded** — el `consent_proof` lo firma apps/app en el redirect previo, y consent solo lo forwardea intacto en el link Autorizar.

### `POST /oauth/token`

Archivo: `apps/app/app/oauth/token/route.ts`. Intercambia el `code` por un `access_token` con verificación PKCE estándar. Sin novedades respecto a la spec OAuth 2.1.

### `POST /oauth/register`

Archivo: `apps/app/app/oauth/register/route.ts`. Dynamic Client Registration (RFC 7591). Implementado mínimo para que ChatGPT pueda registrarse automáticamente sin pre-acuerdo manual.

## Consent proof HMAC (V3.E hardening 2026-06-01)

### Por qué existe

Antes de V3.E, `/oauth/authorize` aceptaba un parámetro suelto `?consent_confirmed=1` para saltar el consent screen. Esto permitía un **replay attack**: cualquier atacante con la cookie `__session` del usuario podía construir una URL que mintease un code sin ver el consent.

Mitigantes parciales preexistentes (PKCE + redirect_uri allowlist por origen) limitaban el daño práctico, pero el modelo de seguridad de OAuth 2.0 exige que el consent sea **no-spoofable**.

### Implementación

```ts
// packages/utils/consent-proof.ts
export function signConsentProof(input: ConsentProofInput, secret: string): string {
  const data = [
    input.uid,
    input.clientId,
    input.redirectUri,
    input.scope,
    input.codeChallenge,
  ].join('|');
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function verifyConsentProof(
  proof: string | null | undefined,
  input: ConsentProofInput,
  secret: string
): boolean {
  if (!proof || !secret) return false;
  const expected = signConsentProof(input, secret);
  const a = Buffer.from(proof, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

### Qué vincula el HMAC

El proof firma los **5 valores que NO deben cambiar** entre consent y mint:

1. `uid` — usuario que da consent
2. `client_id` — app que recibe el token
3. `redirect_uri` — callback donde llega el code
4. `scope` — permisos solicitados
5. `code_challenge` — prueba PKCE del cliente

Si un atacante intenta cambiar cualquiera de estos, el HMAC no coincide → `/oauth/authorize` redirige de vuelta a consent screen (no mintea).

### Path entre apps

- `apps/app/app/oauth/authorize/route.ts:455-498` firma el proof y lo añade al redirect a consent.
- `apps/holded/app/oauth/consent/page.tsx:74-79` lo forwardea intacto al link Autorizar.
- `apps/app/app/oauth/authorize/route.ts:219` lo verifica en la siguiente visita.
- `apps/app/app/oauth/consent/page.tsx:78-99` mismo patrón para el consent fallback servido bajo apps/app.

## Login flow (`/auth/holded-direct`)

Archivo: `apps/holded/app/auth/holded-direct/page.tsx` + cliente `HoldedDirectForm.tsx`.

Flujo de 2 pasos en la misma URL:

**Step 1 — Auth** (visible si `sessionEmail === null`):

- Botón "Continuar con Google" (Firebase signInWithPopup).
- Input "Continuar con correo" (Firebase magic link via `sendMagicLinkEmail`).
- Detección de WebView (ChatGPT mobile / Claude mobile / Instagram in-app) — oculta Google porque su `User-Agent` no es válido para OAuth y muestra advertencia "abre en navegador externo".

Tras éxito → la cookie `__session` (JWT HS256 firmado con `SESSION_SECRET`, scope `Domain=.verifactu.business`, `SameSite=lax`, `HttpOnly`, `Secure`) se persiste.

**Step 2 — API key** (visible si `sessionEmail !== null`):

- Chip verde `[✓ usuario@email.com]` + opción "¿No eres tú? Cambiar cuenta".
- Input API key Holded con regex client-side `^[a-f0-9]{32}$/i`.
- Checkboxes obligatorios: T&C + Privacy.
- Botón "Conectar Holded".
- Link footer discreto "¿Aún no usas Holded? Pruébalo gratis" → `www.holded.com/es`.

Tras éxito → POST `/api/auth/holded-direct` valida la key contra Holded (`/api/team/v1/users`), la cifra con `HOLDED_KEY_SECRET` (AES-256-GCM) y la persiste en `AccountingIntegration`.

## Sesión y cookie

```ts
// packages/utils/session.ts
{
  name: '__session',
  httpOnly: true,
  secure: true,                // forzado por env en producción
  sameSite: 'lax',             // SEC C3 2026: cambió de 'none' → 'lax'
  path: '/',
  domain: '.verifactu.business', // SSO entre subdominios
  maxAge: 30 días,
}
```

JWT payload:

```ts
{
  uid: string,           // Firebase UID
  email: string | null,
  name: string | null,
  tenantId: string,      // tenant activo
  tenants?: string[],    // tenants accesibles
  rememberDevice?: boolean,
}
```

Verificación con `jose.jwtVerify` (HS256). Soporta key rotation via `SESSION_SECRET_PREVIOUS` (lista separada por comas).

## Threats considered y mitigaciones

| Ataque | Mitigación |
|---|---|
| JWT forge (atacante intenta firmar su propio JWT) | HS256 con `SESSION_SECRET` ≥32 chars. jose rechaza `alg:none`. |
| Replay del consent screen | HMAC binding V3.E (`consent_proof`). |
| Phishing de redirect_uri | Allowlist por origen (chatgpt.com, claude.ai, etc.). Path libre dentro del origen. |
| Authorization code interception | PKCE S256 obligatorio. Code expira en ~5 min y es one-time. |
| Scope creep por cliente OAuth malicioso | Intersección con `getPublicScopePreset()` en `/oauth/authorize` antes de mintar. |
| CSRF en `/auth/holded-direct` | `SameSite=lax` cookie + endpoint requiere sesión válida pre-existente. |
| Session fixation | Cookie regenerada en cada login exitoso. |
| API key Holded leak desde DB | AES-256-GCM con `HOLDED_KEY_SECRET` (env, no committed). |
| API key Holded leak al modelo | Decryption SOLO en el handler de tool, nunca se incluye en structuredContent ni en text response. |
| Cross-tenant access | Cookie tenantId verificado contra `Membership` activa antes de cada request (resolveSharedTenantSession). |

## Cosas que NO son bugs aunque lo parezcan

### "Aunque me logueo con otra cuenta Google, sigo viendo el email anterior"

Reportado por el usuario 2026-06-01. Explicación:

- La cookie `__session` tiene `Domain=.verifactu.business` y persiste 30 días.
- Google sign-in en el navegador es **independiente** de nuestra sesión.
- Cambiar de cuenta Gmail no borra nuestra cookie — la sesión sigue viva.

Comportamiento correcto. La página `/auth/holded-direct` muestra un chip "¿No eres tú? Cambiar cuenta" que invoca logout si el usuario quiere cambiar.

Verificación: abrir en incógnito y comprobar que el step 1 (Google + magic link) aparece sin email pre-cargado. Confirmado por el usuario el 2026-06-01.

### "Holded API key se ve en el `Authorization` header del request a Holded"

Por diseño. La API key Holded se pasa como header `key:` (no Bearer) en cada request al endpoint de Holded. Nuestro adapter desencripta la key justo antes del fetch y la descarta del scope al terminar — no se persiste en logs ni en error messages.

Si quieres ver evidencia: `apps/app/lib/integrations/accounting.ts:buildHoldedHeaders` y verifica que la key nunca se loguea.
