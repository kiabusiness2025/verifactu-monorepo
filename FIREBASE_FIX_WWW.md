# Fix: OAuth falla con www.verifactu.business

## Problema

OAuth falla cuando accedes a `https://www.verifactu.business/auth/login` porque:

1. **Firebase Auth** solo tiene autorizado `verifactu.business` (sin www)
2. **Vercel** no está redirigiendo `www` → non-`www` automáticamente
3. **Cookies** están configuradas para `domain: .verifactu.business` pero el navegador ve `www` como dominio diferente

## Solución

### 1. Firebase Console - Autorizar dominio con www

1. Ir a [Firebase Console](https://console.firebase.google.com/project/verifactu-business/authentication/settings)
2. **Authentication** → **Settings** → **Authorized domains**
3. **Añadir dominio**: `www.verifactu.business`
4. Guardar cambios

### 2. Vercel - Redirect www → non-www

Opción A: **Configurar en Vercel Dashboard** (recomendado)

1. Ir a proyecto `verifactu-landing` en Vercel
2. **Settings** → **Domains**
3. Añadir `www.verifactu.business` si no está
4. Click en dominio `www.verifactu.business`
5. **Redirect to** → `verifactu.business` (non-www)
6. Guardar

Opción B: **Configurar en vercel.json**

Añadir redirect en `apps/landing/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "cd ../.. && node -v && npm -v && npx -y pnpm@10.27.0 -v && npx -y pnpm@10.27.0 install --frozen-lockfile",
  "buildCommand": "cd ../.. && npx -y pnpm@10.27.0 -v && npx -y pnpm@10.27.0 turbo run build --filter=verifactu-landing",
  "devCommand": "pnpm run dev",
  "outputDirectory": ".next",
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.verifactu.business"
        }
      ],
      "destination": "https://verifactu.business/:path*",
      "permanent": true
    }
  ]
}
```

### 3. DNS - Configurar www subdomain

En tu proveedor DNS (Cloudflare, Namecheap, etc.):

1. Añadir registro **CNAME**:
   - Name: `www`
   - Target: `cname.vercel-dns.com`
   - TTL: Auto

O si usas A records:

2. Añadir registro **A**:
   - Name: `www`
   - IP: `76.76.21.21` (Vercel IP)
   - TTL: Auto

3. Añadir registro **AAAA** (IPv6):
   - Name: `www`
   - IP: `2606:4700:10::6816:1515` (Vercel IPv6)

## Verificación

Después de aplicar cambios:

1. **Test redirect www → non-www**:
   ```bash
   curl -I https://www.verifactu.business
   # Debería retornar 301/308 redirect a https://verifactu.business
   ```

2. **Test Firebase Auth**:
   - Acceder a https://verifactu.business/auth/login
   - Click en "Continuar con Google"
   - Debería abrir popup de Google OAuth correctamente

3. **Test cookies cross-domain**:
   - Login en https://verifactu.business/auth/login
   - Redirect a https://app.verifactu.business/dashboard
   - Verificar que mantiene sesión (no pide login de nuevo)

## Checklist

- [ ] Firebase: Dominio `www.verifactu.business` autorizado
- [ ] Vercel: Redirect `www` → non-`www` configurado
- [ ] DNS: Registro CNAME para `www` apuntando a Vercel
- [ ] Test: `curl -I https://www.verifactu.business` retorna redirect
- [ ] Test: Login funciona en `https://verifactu.business`
- [ ] Test: OAuth Google funciona sin popup bloqueado
- [ ] Test: Sesión persiste en `app.verifactu.business`

## Alternativa: Permitir ambos dominios

Si prefieres **soportar ambos** (www y non-www) en lugar de redirect:

1. **Firebase**: autorizar ambos dominios
2. **Vercel**: asignar ambos como production domains
3. **Código**: actualizar `.env.local`:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://verifactu.business,https://www.verifactu.business
   ```

⚠️ **No recomendado** por SEO y consistencia de cookies.

## Impacto SEO

El redirect `www` → non-`www` es **positivo para SEO**:
- Evita contenido duplicado
- Consolida autoridad de dominio
- Google prefiere una versión canónica

## Referencias

- [Firebase Auth Authorized Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices#authorized-domains)
- [Vercel Redirects](https://vercel.com/docs/concepts/projects/project-configuration#redirects)
- [Vercel DNS](https://vercel.com/docs/concepts/projects/domains)
