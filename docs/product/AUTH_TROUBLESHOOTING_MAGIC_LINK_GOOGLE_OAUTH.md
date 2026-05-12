# Auth troubleshooting — Magic Link no llega + Google OAuth bloqueado en webviews

**Fecha:** 11 mayo 2026
**Síntomas reportados:**

1. Google bloquea OAuth desde apps (`disallowed_useragent` en logs de Firebase)
2. Emails de magic link no llegan al inbox

## Resumen de la causa raíz

**Ambos conectores (ChatGPT y Claude) usan el mismo flow Firebase Auth** en `apps/holded/auth/holded-direct` → `sendSignInLinkToEmail` + `signInWithPopup` (Google).

- Google OAuth: bloqueado en **webviews embebidas** de las apps móviles (ChatGPT iOS in-app browser, Claude desktop si está montado en Electron+WebView). Google policy desde 2021.
- Magic link: si Firebase está mal configurado (dominio sender, authorized domains, plantilla), Firebase devuelve `{ ok: true }` pero el email no se envía o llega a spam.

Implementación está en:

- `apps/holded/app/lib/auth.ts` — `sendMagicLinkEmail()` línea 598
- `apps/holded/app/auth/holded-direct/HoldedDirectForm.tsx` — handlers
- Firebase Auth project: **`verifactu-business`** (proyecto Firebase canonical)

---

## Problema #1 — Magic link no llega

### Causas probables (en orden de probabilidad)

#### 1.1. Authorized domains incompleto en Firebase Console (MÁS PROBABLE)

Firebase **rechaza silenciosamente** los magic links cuyo `actionCodeSettings.url` apunta a un dominio que no está en la lista de "Authorized domains" de Authentication.

**Acción:**

1. Abre [Firebase Console](https://console.firebase.google.com) → Proyecto `verifactu-business`
2. Authentication → Settings → Authorized domains
3. **Verifica que aparezcan TODOS estos:**
   - `localhost` (desarrollo)
   - `verifactu-business.firebaseapp.com` (default)
   - `verifactu-business.web.app` (default)
   - `holded.verifactu.business` ← crítico
   - `app.verifactu.business`
   - `claude.verifactu.business` ← añadir si vamos a usar bridge a Claude
   - `chatgpt.com` (si Claude/ChatGPT app intentan abrir el link en webview)
4. Si falta alguno, **Add domain** → escribir el dominio sin protocolo

#### 1.2. Email Sign-in NO está habilitado

Firebase Auth tiene Email/Password **separado** de Email link (passwordless).

**Acción:**

1. Firebase Console → Authentication → Sign-in method
2. Localiza **Email/Password**
3. Click → **Edit**
4. Activa:
   - ✅ Email/Password
   - ✅ **Email link (passwordless sign-in)** ← este es el que faltaría a menudo
5. Save

#### 1.3. Sender domain reputation (emails a spam)

Firebase por defecto manda los magic links desde `noreply@verifactu-business.firebaseapp.com`. Ese dominio no tiene SPF/DKIM/DMARC controlados por nosotros y Gmail/Outlook lo meten en spam/promotions con frecuencia.

**Acción inmediata (workaround):**

- Decir al usuario "**revisa spam, busca por 'verifactu-business' o por la palabra 'Holded'**".

**Acción definitiva (configurar SMTP propio):**

1. Firebase Console → Authentication → Templates
2. Pestaña **Email link sign-in**
3. **Customize domain** → conecta `verifactu.business` o subdominio (DNS TXT records)
4. **SMTP Server** → click pencil icon arriba a la derecha
5. Mete credenciales SMTP de nuestro proveedor (Resend/Sendgrid/Postmark):
   ```
   SMTP Host: smtp.resend.com (o equivalente)
   Port: 465
   Username: resend
   Password: <api_key>
   Sender email: soporte@verifactu.business
   Sender name: Verifactu Business
   ```
6. Save → Firebase enviará los magic links desde **soporte@verifactu.business** con DKIM/SPF firmados → deliverability perfecta

#### 1.4. App Check bloqueando el sendSignInLinkToEmail

Si tenemos App Check con reCAPTCHA v3 activado en producción, Firebase puede rechazar el send si el token de reCAPTCHA falla.

**Acción de diagnóstico:**

1. Abre DevTools → Network → filtra por `securetoken` o `identitytoolkit`
2. En el form de magic link, click "Continuar con correo"
3. Si ves un 403 con `app-check-token-invalid` → App Check está bloqueando

**Fix:**

- Verificar que `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY` está en Vercel
- Verificar que reCAPTCHA v3 está habilitado para `holded.verifactu.business` en Google Cloud Console
- Como workaround temporal: setear `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN=true` en preview, NO en prod

#### 1.5. Quota de Firebase Auth gratis excedido

Plan Spark (free) → 10 emails/segundo, sin límite diario. Plan Blaze → ilimitado.

**Acción de diagnóstico:**

- Firebase Console → Authentication → Users → si ves "Disabled" en muchos users recientes, posible quota
- Firebase Console → Quotas → Auth → ver si hay throttling

### Test rápido para aislar el problema

Ejecuta esto en DevTools console mientras estás en `/auth/holded-direct`:

```js
// Test directo de Firebase Auth
const auth = firebase.auth();
auth
  .sendSignInLinkToEmail('tu_correo_personal@gmail.com', {
    url: 'https://holded.verifactu.business/auth/holded-direct?magic_email=tu_correo_personal@gmail.com',
    handleCodeInApp: true,
  })
  .then(() => console.log('✓ Firebase reportó success'))
  .catch((e) => console.error('✗ Firebase error:', e.code, e.message));
```

Resultado esperado:

- `auth/unauthorized-continue-uri` → falta `holded.verifactu.business` en authorized domains (causa 1.1)
- `auth/operation-not-allowed` → Email link sign-in no está activado (causa 1.2)
- `auth/quota-exceeded` → causa 1.5
- `✓ Firebase reportó success` pero NO llega → causa 1.3 (spam) o 1.4 (App Check)

---

## Problema #2 — Google OAuth bloqueado en webviews

### Causa

Google bloquea `signInWithPopup` y `signInWithRedirect` desde **embedded webviews** (`UIWebView`, `WKWebView` en iOS, `WebView` en Android, Electron BrowserWindow sin `nodeIntegration:false`). Devuelve `disallowed_useragent`.

ChatGPT app mobile usa WKWebView → bloqueado.
Claude desktop usa Electron con BrowserWindow → puede estar bloqueado.

### Solución

#### A) Detectar webview y mostrar mensaje "abre en navegador externo"

```ts
// apps/holded/app/auth/holded-direct/HoldedDirectForm.tsx

function isLikelyEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  // Heurísticas conocidas
  return (
    // iOS WKWebView dentro de app (sin Safari)
    (/(iphone|ipad|ipod).*applewebkit(?!.*safari)/i.test(ua)) ||
    // FBAN/FBAV → Facebook in-app
    /fban|fbav|fb_iab|instagram|line|twitter|micromessenger/i.test(ua) ||
    // ChatGPT / Claude apps (heurística — pueden cambiar)
    /chatgpt|anthropic|claudeapp/i.test(ua) ||
    // Electron sin nodeIntegration (genérico)
    /electron/i.test(ua)
  );
}

// En el JSX, antes del botón "Continuar con Google":
{isLikelyEmbeddedWebView() ? (
  <div className="webview-warning">
    <p>⚠️ Google bloquea el login desde aplicaciones embebidas.</p>
    <p>
      Pulsa el botón de abajo para abrir esta página en tu navegador.
      Tras conectar Holded, vuelves a la app y el connector ya estará listo.
    </p>
    <a
      href={`https://holded.verifactu.business/auth/holded-direct${window.location.search}`}
      target="_blank"
      rel="noopener noreferrer"
      className="open-in-browser-btn"
    >
      🌐 Abrir en navegador externo
    </a>
    <p>O usa <strong>Continuar con correo</strong> (magic link) — no necesita Google.</p>
  </div>
) : (
  <button onClick={handleGoogleSignIn}>Continuar con Google</button>
)}
```

#### B) Recomendar magic link como flow primario en webviews

Si detectamos webview, **escondemos el botón de Google** y mostramos magic link como única opción. El magic link abre en el inbox del usuario en su navegador del sistema → bypass del webview.

---

## Acciones recomendadas (en orden)

### 🟢 Hoy mismo (30 min)

1. **Firebase Console → Authorized domains** — añadir `claude.verifactu.business` si falta
2. **Firebase Console → Email/Password → Email link sign-in** — verificar que está activado
3. **Test directo** desde DevTools con el snippet de arriba para aislar el error

### 🟡 Esta semana (2-4 h)

4. **Configurar SMTP propio** en Firebase Console (Templates → SMTP Server) con Resend o Postmark + `soporte@verifactu.business` como sender
5. **Detectar webview** en HoldedDirectForm.tsx + esconder botón Google + mostrar magic link primero
6. **Custom action URL** en Firebase Console (Templates → Email sign-in → Edit → Customize action URL) apuntando a `https://holded.verifactu.business/auth/holded-direct/finish`

### 🟠 Cuando tengamos tiempo (1 día)

7. **Custom email template** en Firebase (Templates → Email sign-in) con branding Holded
8. **Custom email link domain** — verificar `auth.holded.verifactu.business` para que el link no diga `firebaseapp.com`

---

## Documentos relacionados

- [Plan T#50 bridge Claude → Firebase auth](./CLAUDE_BRIDGE_FIREBASE_AUTH_PLAN.md)
- Firebase docs: https://firebase.google.com/docs/auth/web/email-link-auth
- Google OAuth webview policy: https://developers.googleblog.com/2016/08/modernizing-oauth-interactions-in-native-apps.html
