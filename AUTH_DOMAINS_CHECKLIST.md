# Checklist: Configuracion de Autenticacion y Dominios

## 1. Firebase - Dominios Autorizados
[ ] Accede a: https://console.firebase.google.com/project/verifactu-business/authentication/settings
[ ] En "Authorized domains" verifica que esten:
    - [ ] `www.verifactu.business`
    - [ ] `verifactu.business` 
    - [ ] `localhost` (para desarrollo local)
    - [ ] `app.verifactu.business` (si OAuth se usa en app)
[ ] Guarda cambios si falta alguno

## 2. Vercel - Landing Project (verifactu-landing)
Accede a: https://vercel.com/dashboard/projects

### Environment Variables
Verifica que tenga:
[ ] `NEXT_PUBLIC_APP_URL=https://app.verifactu.business`
[ ] `SESSION_SECRET=<valor-seguro>`
[ ] `FIREBASE_ADMIN_PROJECT_ID=verifactu-business`
[ ] `FIREBASE_ADMIN_CLIENT_EMAIL=<email-correcto>`
[ ] `FIREBASE_ADMIN_PRIVATE_KEY=<key-completa>`

### Domains
[ ] Dominio principal: `www.verifactu.business`
[ ] Alias (opcional): `verifactu.business`

## 3. Vercel - App Project (verifactu-app)  
Accede a: https://vercel.com/dashboard/projects

### Environment Variables
Verifica que tenga:
[ ] `NEXT_PUBLIC_APP_URL=https://app.verifactu.business`
[ ] `NEXT_PUBLIC_LANDING_URL=https://www.verifactu.business`
[ ] `SESSION_SECRET=<mismo-valor-que-landing>`
[ ] Variables de Firebase (mismo admin SDK)
[ ] Variables de Stripe si las usa

### Domains
[ ] Dominio principal: `app.verifactu.business`

## 4. Test de Flujo de Autenticacion
[ ] Accede a https://www.verifactu.business/auth/login
[ ] Click en "Acceder con Google" o email
[ ] Verifica que redirige a login de Firebase
[ ] Tras login, deberia redirigir a https://app.verifactu.business/dashboard
[ ] Verifica que la sesion persiste en app.verifactu.business

## 5. Cookies y CORS
[ ] Headers de seguridad en ambos proyectos incluyen:
    - `Access-Control-Allow-Credentials: true` (si cross-origin)
    - Cookies con `SameSite=Lax` o `Lax`
    - `Domain: .verifactu.business` para compartir entre subdominios

## Notas
- Si el error persiste, limpia cookies del navegador
- Si OAuth no funciona, verifica que Firebase redirige estan configuradas en la consola
- El dominio landing DEBE ser www.verifactu.business para OAuth (sin www no funciona correctamente)
