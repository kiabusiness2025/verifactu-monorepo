# T#50 — Bridge Claude OAuth → Firebase auth (Opción 2)

**Status:** in progress — 11 mayo 2026
**Owner:** Verifactu Business
**Problema:** consent screen Claude pide email sin verificar → usuario puede dejar email equivocado.

## Cambios necesarios (5 ficheros)

### 1. `apps/holded-mcp/src/config.ts` — añadir SESSION_SECRET

```diff
@@ -X,Y +X,Z @@
   OAUTH_AUTH_CODE_TTL_SECONDS: z.coerce.number().default(600),
   OAUTH_TOKEN_TTL_SECONDS: z.coerce.number().default(3600),
   OAUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().default(2592000),
+  // Compartido con apps/app y apps/holded para verificar la cookie .verifactu.business
+  // firmada con HS256 desde /api/auth/holded-direct (Firebase Google + magic link).
+  // Si no está seteado, el bridge a Firebase queda desactivado y el consent screen
+  // sigue pidiendo email plano (estado pre-bridge).
+  SESSION_SECRET: z.string().min(16).optional(),
+  // URL pública del Next.js de Holded donde vive /auth/holded-direct (Firebase auth).
+  HOLDED_PUBLIC_URL: z.string().url().default('https://holded.verifactu.business'),
```

### 2. `apps/holded-mcp/src/oauth-routes.ts` — helpers nuevos

Al principio del archivo, después de los imports:

```ts
// ──────────────────────────────────────────────────────────────────────
// T#50 Opción 2: bridge a Firebase auth de apps/holded
// ──────────────────────────────────────────────────────────────────────
const VERIFACTU_SESSION_COOKIE_NAME = '__session';

interface VerifactuSessionPayload {
  uid: string;
  email: string;
  name?: string | null;
  tenantId?: string;
}

/**
 * Parsea la cookie `__session` del header Cookie (sin cookie-parser).
 * Devuelve el valor crudo o null.
 */
function readSessionCookieRaw(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== 'string' || !cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const c of cookies) {
    const eq = c.indexOf('=');
    if (eq < 0) continue;
    const name = c.slice(0, eq);
    if (name === VERIFACTU_SESSION_COOKIE_NAME) {
      return decodeURIComponent(c.slice(eq + 1));
    }
  }
  return null;
}

/**
 * Verifica el JWT de la cookie usando SESSION_SECRET (mismo secret que apps/app
 * y apps/holded). Devuelve null si no hay cookie, si no hay SESSION_SECRET
 * configurado, o si la verificación falla.
 */
async function verifyVerifactuSession(req: Request): Promise<VerifactuSessionPayload | null> {
  if (!config.SESSION_SECRET) return null;
  const token = readSessionCookieRaw(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.SESSION_SECRET));
    const uid = typeof payload.uid === 'string' ? payload.uid : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!uid || !email) return null;
    return {
      uid,
      email,
      name: typeof payload.name === 'string' ? payload.name : null,
      tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Construye la URL de bridge a /auth/holded-direct con `next=` apuntando de
 * vuelta a este endpoint para que tras Firebase auth el usuario vuelva al
 * consent screen con sesión verificada.
 */
function buildFirebaseBridgeUrl(req: Request): string {
  const directUrl = new URL('/auth/holded-direct', config.HOLDED_PUBLIC_URL);
  directUrl.searchParams.set('source', 'claude_consent');

  // El `next` debe ser la URL actual completa de /oauth/authorize?...
  // para que cuando vuelva, el consent screen se re-renderice con todos los
  // params OAuth originales.
  const currentUrl = new URL(req.originalUrl, config.BASE_URL);
  directUrl.searchParams.set('next', currentUrl.toString());
  return directUrl.toString();
}
```

### 3. `apps/holded-mcp/src/oauth-routes.ts` — modificar GET /oauth/authorize

Cambiar el handler para que sea `async`, verifique sesión, y redirija si no hay:

```diff
-oauthRouter.get('/authorize', (req: Request, res: Response) => {
+oauthRouter.get('/authorize', async (req: Request, res: Response) => {
   const {
     client_id,
     redirect_uri,
@@ -X,Y +X,Z @@
   if (
     typeof code_challenge === 'string' &&
     code_challenge &&
     !isValidPkceCodeChallenge(code_challenge)
   ) {
     res.status(400).send('code_challenge invalido');
     return;
   }

+  // T#50 Opción 2: si no hay sesión verificada (.verifactu.business cookie
+  // de Firebase auth), redirigir al flow Firebase de apps/holded antes de
+  // mostrar el consent screen. Si no hay SESSION_SECRET configurado, fallback
+  // al consent screen plano (modo legacy).
+  const session = await verifyVerifactuSession(req);
+  if (!session && config.SESSION_SECRET) {
+    const bridgeUrl = buildFirebaseBridgeUrl(req);
+    logger.info('[claude/oauth/authorize] No verifactu session, bridging to Firebase auth', {
+      next: bridgeUrl,
+      clientId: String(client_id),
+    });
+    res.redirect(302, bridgeUrl);
+    return;
+  }

   res.send(
     consentPage(
       String(client_id),
       String(redirect_uri),
       String(state ?? ''),
       false,
       normalizedScope,
       typeof code_challenge === 'string' ? code_challenge : null,
-      code_challenge_method === 'S256' ? 'S256' : null
+      code_challenge_method === 'S256' ? 'S256' : null,
+      // Email verificado por Firebase — si existe, el consent screen lo muestra
+      // como read-only y solo pide API key + checkboxes.
+      session
+        ? {
+            personalEmail: session.email,
+            personalName: session.name ?? null,
+            verifiedUid: session.uid,
+          }
+        : undefined
+    )
+  );
+});
```

### 4. `apps/holded-mcp/src/oauth-routes.ts` — modificar consentPage()

Añadir un parámetro `verified` al final que cuando viene rellenado:

- Renderiza el email como `<input ... disabled readonly>` con badge "✓ Email verificado por Google/Magic Link"
- Añade un `<input type="hidden" name="verified_uid" value="...">`
- Quita el input "personal_email" libre

```ts
function consentPage(
  clientId: string,
  redirectUri: string,
  state: string,
  error: boolean,
  scope: string,
  codeChallenge: string | null,
  codeChallengeMethod: 'S256' | null,
  verified?: {
    personalEmail: string;
    personalName?: string | null;
    verifiedUid: string;
  } | null
): string {
  // ...
  // En el HTML, donde estaba <input id="personal_email">, condicionar:
  const emailFieldHtml = verified
    ? `
      <div class="field">
        <div class="label-row">
          <label>Email verificado</label>
          <span class="help">✓ Verificado por Google</span>
        </div>
        <input type="email" value="${escapeHtml(verified.personalEmail)}" disabled readonly
               style="background:#f8fafc;color:#475569;">
        <input type="hidden" name="verified_uid" value="${escapeHtml(verified.verifiedUid)}">
        <input type="hidden" name="personal_email" value="${escapeHtml(verified.personalEmail)}">
      </div>
    `
    : `
      <div class="field">
        <div class="label-row">
          <label for="personal_email">Tu email</label>
        </div>
        <input type="email" id="personal_email" name="personal_email"
               placeholder="tu@empresa.com" required autocomplete="email" inputmode="email"
               value="${escapeHtml(prefill.personalEmail ?? '')}">
      </div>
    `;
}
```

### 5. `apps/holded-mcp/src/oauth-routes.ts` — modificar POST /oauth/authorize

Cuando viene `verified_uid` en el body, NO confiar en `personal_email` del form, leerlo de la sesión:

```diff
 oauthRouter.post('/authorize', async (req: Request, res: Response) => {
   // ...
+  // T#50 Opción 2: si vino con sesión Firebase verificada, releer la cookie
+  // server-side (no confiar en el `verified_uid` del body, que el cliente
+  // pudo modificar). El email/uid auténticos vienen de la cookie firmada.
+  const session = await verifyVerifactuSession(req);
+  const trustedEmail = session?.email ?? null;
+  const trustedUid = session?.uid ?? null;

   const personalEmail = typeof req.body?.personal_email === 'string'
     ? req.body.personal_email.trim()
     : '';
+  // Si hay sesión, el email "fuente de verdad" es el de la cookie, NO el del form.
+  const effectiveEmail = trustedEmail || personalEmail;
   // ...
   // En la llamada al F1 helper, pasar:
   const upsertPayload = {
-    personalEmail,
+    personalEmail: effectiveEmail,
+    // Si hay sesión Firebase, pasar el userId existente para que F1 reutilice
+    // el User en vez de crear uno nuevo basado en el email.
+    ...(trustedUid ? { existingUserId: trustedUid } : {}),
     // ...
   };
```

### 6. `apps/holded/app/lib/holded-navigation.ts` — añadir `claude_consent` a ALLOWED_RETURN_ORIGINS

Verificar que `next=https://claude.verifactu.business/oauth/authorize?...` no se filtra como redirect inseguro:

```diff
-const ALLOWED_RETURN_ORIGINS = new Set([HOLDED_PUBLIC_URL, APP_PUBLIC_URL]);
+const ALLOWED_RETURN_ORIGINS = new Set([
+  HOLDED_PUBLIC_URL,
+  APP_PUBLIC_URL,
+  'https://claude.verifactu.business',
+]);
```

### 7. `apps/holded/app/auth/holded-direct/HoldedDirectForm.tsx` — reconocer `source=claude_consent`

Cuando el form se carga con `?source=claude_consent`, el branding del header puede decir "Conectar Holded con Claude" en vez de "Conectar Holded a ChatGPT". Cambio cosmético — el flow Firebase + API key submit funciona igual.

## Env vars que hay que configurar

En **Render** (apps/holded-mcp deployment):

```bash
SESSION_SECRET=<el mismo secret que usa apps/app y apps/holded en Vercel>
HOLDED_PUBLIC_URL=https://holded.verifactu.business
```

⚠️ **IMPORTANTE:** El `SESSION_SECRET` debe ser **idéntico** al de Vercel apps/app y apps/holded. Si no, la cookie firmada en `.verifactu.business` por Firebase no se podrá verificar desde Render.

## Tests

1. **Flow sin sesión previa:**
   - Click "Conectar Holded" en Claude
   - Claude redirige a `claude.verifactu.business/oauth/authorize?...`
   - Server detecta no hay cookie `__session` → redirect 302 a `holded.verifactu.business/auth/holded-direct?source=claude_consent&next=...`
   - User completa Firebase auth (Google o magic link)
   - User pega API key, submit
   - `/api/auth/holded-direct` mintea cookie `__session` con domain `.verifactu.business`
   - Redirect a `next` = `claude.verifactu.business/oauth/authorize?...`
   - Esta vez SÍ hay cookie → server muestra consent screen con email VERIFIED (read-only)
   - User click "Conectar" → POST mintea code → redirect a `claude.ai/callback`

2. **Flow con sesión previa:**
   - User ya tiene cookie `__session` válida
   - GET /oauth/authorize → server lee cookie → muestra consent directamente con email VERIFIED
   - Skip Firebase auth completo

3. **Fallback si SESSION_SECRET no configurado:**
   - Server muestra el consent screen ANTIGUO (con input email libre)
   - Modo legacy compatible — no rompe deploys que no hayan seteado SESSION_SECRET aún

## Backfill

Los usuarios Claude que ya tienen User en DB (creados pre-bridge con sha256 hash del email) seguirán funcionando — la cookie verificada va por `email`, F1 helper los matchea por email. T#15 (sha256 → User.id) ya hizo el backfill.

## Despliegue

1. Mergear PR
2. Setear `SESSION_SECRET` y `HOLDED_PUBLIC_URL` en Render
3. Deploy apps/holded-mcp
4. Test smoke: connect desde Claude → verificar redirect a /auth/holded-direct → completar flow
5. Si todo OK, eliminar feature flag (el código ya cae a legacy si SESSION_SECRET no está)
