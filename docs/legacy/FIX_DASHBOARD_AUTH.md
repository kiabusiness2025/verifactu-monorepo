# Fix: Error en Transicion a Dashboard - Autenticacion

## Diagnóstico
El error "El error entre cambio a dashboard persigue" probablemente significa:
- [ ] Login funciona en https://www.verifactu.business/auth/login
- [ ] Pero al redirigir a https://app.verifactu.business/dashboard, falla autenticación
- [ ] O las cookies de sesión no se comparten entre dominios

## Problemas Identificados

### 1. Firebase Auth - Dominios No Autorizados
**Ubicación**: https://console.firebase.google.com/project/verifactu-business/authentication/settings

**Acción requerida**:
Ir a "Authorized domains" y asegurarse que incluye:
- `www.verifactu.business` ← **CRÍTICO: Este es el que probablemente falta**
- `verifactu.business`
- `app.verifactu.business` (si OAuth se usa en app)
- `localhost` (desarrollo)

Si falta alguno, agregarlo manualmente.

### 2. Vercel Environment Variables - Proyecto Landing
**Ubicación**: https://vercel.com/dashboard/projects → verifactu-landing → Settings → Environment Variables

**Debe tener**:
```
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
SESSION_SECRET=<valor-aleatorio-seguro>
FIREBASE_ADMIN_PROJECT_ID=verifactu-business
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@verifactu-business.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=<clave-RSA-privada-completa>
```

**Verificación**: Las claves de Firebase deben ser las mismas en ambos proyectos (landing y app).

### 3. Vercel Environment Variables - Proyecto App
**Ubicación**: https://vercel.com/dashboard/projects → verifactu-app → Settings → Environment Variables

**Debe tener** (IGUAL que landing):
```
SESSION_SECRET=<MISMO-VALOR-QUE-LANDING>
FIREBASE_ADMIN_PROJECT_ID=verifactu-business
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@verifactu-business.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=<MISMA-CLAVE-QUE-LANDING>
NEXT_PUBLIC_LANDING_URL=https://www.verifactu.business
NEXT_PUBLIC_APP_URL=https://app.verifactu.business
```

### 4. Configuración de Cookies (Código)
**Archivo**: `apps/landing/app/api/auth/session/route.ts`

**Estado**: ✓ Correcto
- Automáticamente establece `domain: .verifactu.business` para ambos `www.verifactu.business` y `app.verifactu.business`
- Cookies compartidas entre subdominios

## Pasos para Resolver

### Paso 1: Verificar Firebase
1. Abre https://console.firebase.google.com/project/verifactu-business/authentication/settings
2. Scroll a "Authorized domains"
3. ¿Está `www.verifactu.business`? 
   - ✓ Sí → Continúa con Paso 2
   - ✗ No → Agrégalo manualmente

### Paso 2: Forzar Redeploy en Vercel
1. https://vercel.com/dashboard/projects → verifactu-landing
2. Deployment settings → Redeploy (o `git commit --allow-empty && git push`)
3. Espera a que termine el build

### Paso 3: Test de Flujo Completo
1. **Limpia cookies**: Abre DevTools → Application → Cookies → Elimina todas de verifactu.business
2. **Accede a landing**: https://www.verifactu.business/
3. **Click en "Acceder"**: Debería ir a /auth/login
4. **Login**: Usa Google OAuth o email/password
5. **Verificar redirección**: Debería redirigir a https://app.verifactu.business/dashboard automáticamente
6. **Verificar sesión**: La sesión debería persistir en el dashboard

## Si el Problema Persiste

### Debug: Verifica las Cookies
En https://app.verifactu.business/dashboard:
- Abre DevTools → Application → Cookies
- ¿Existe cookie `__session`?
  - ✓ Sí → El problema es del lado de la app (dashboard)
  - ✗ No → Las cookies no se comparten entre dominios

### Debug: Verifica Headers de Respuesta
En https://www.verifactu.business/api/auth/session (POST):
```bash
curl -X POST https://www.verifactu.business/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test"}'
```

Busca en headers:
- `Set-Cookie: __session=...; Domain=.verifactu.business; Path=/; ...`

Si `Domain` está vacío o es incorrecto, el middleware no está leyendo bien el host.

## Resumen de Checklist

- [ ] Firebase: `www.verifactu.business` autorizado
- [ ] Vercel Landing: Variables de entorno correctas
- [ ] Vercel App: Variables de entorno correctas (SESSION_SECRET igual)
- [ ] Vercel Landing: Redeploy después de cambios
- [ ] Test: Login en https://www.verifactu.business/auth/login
- [ ] Test: Redirige a https://app.verifactu.business/dashboard
- [ ] Test: Cookies compartidas (cookie `__session` existe en app)
- [ ] Test: Sesión persiste después de recarga

## Contacto
Si después de esto el problema persiste, revisa:
1. Logs de Vercel (verifactu-landing → Deployments → latest → Logs)
2. Errores en console del navegador (F12 → Console)
3. Errores en Firebase Console (Authentication → Logs)
