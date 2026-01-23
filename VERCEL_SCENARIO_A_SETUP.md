# 🚀 Configuración Vercel para Scenario A

**Fecha**: 21 de enero de 2026  
**Prisma Accelerate**: ✅ Configurado

## 📝 Resumen Rápido

Acabas de configurar Prisma Accelerate. Ahora necesitas:

1. ✅ **Copiar la URL completa** de Prisma Accelerate (con API key completo)
2. 🔄 **Configurar en Vercel** las variables de entorno
3. 🚀 **Desplegar** (automático o manual)
4. ✅ **Verificar** que todo funciona

---

## 🔑 URL de Prisma Accelerate

Tu URL (cópiala completa desde el dashboard de Prisma):

```
prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19Va09UenlOLXVoTDBYYmxtRzRNRkwi...
```

⚠️ **IMPORTANTE**:

- El API key debe estar **completo** (no terminar en ...)
- Cópialo desde: https://console.prisma.io/ → Tu proyecto → Connection String
- La URL completa puede ser muy larga (300+ caracteres)

---

## 🔷 Proyecto 1: verifactu-app (Dashboard de Clientes)

**URL Vercel**: https://vercel.com/kiabusiness2025/verifactu-app/settings/environment-variables

### Variables a Configurar:

#### 1. Base de Datos

```
Name: DATABASE_URL
Value: [PEGA AQUÍ LA URL COMPLETA DE PRISMA ACCELERATE]
Environments: Production ✅, Preview ✅, Development ❌
```

#### 2. Firebase Admin SDK

```
Name: FIREBASE_ADMIN_PROJECT_ID
Value: verifactu-business-480212
Environments: Production ✅, Preview ✅

Name: FIREBASE_ADMIN_CLIENT_EMAIL
Value: firebase-adminsdk-xxxxx@verifactu-business-480212.iam.gserviceaccount.com
Environments: Production ✅, Preview ✅

Name: FIREBASE_ADMIN_PRIVATE_KEY
Value: "-----BEGIN PRIVATE KEY-----\n[TU_CLAVE_COMPLETA]\n-----END PRIVATE KEY-----\n"
Environments: Production ✅, Preview ✅
```

💡 **Cómo obtener estos valores**:

- Los tienes en tu archivo local: `apps/app/.env.local`
- Copia exactamente como están (incluyendo las comillas para la private key)
- Los `\n` deben ser LITERALES (backslash seguido de n, NO saltos de línea reales)

---

## 🔶 Proyecto 2: verifactu-admin (Panel de Administración)

**URL Vercel**: https://vercel.com/kiabusiness2025/verifactu-admin/settings/environment-variables

### Variables a Configurar:

#### 1. Base de Datos (misma que app)

```
Name: DATABASE_URL
Value: [MISMA URL DE PRISMA ACCELERATE QUE ANTES]
Environments: Production ✅, Preview ✅
```

#### 2. NextAuth

```
Name: NEXTAUTH_URL
Value: https://verifactu-admin.vercel.app
Environments: Production ✅

Name: NEXTAUTH_SECRET
Value: [GENERA UNO NUEVO - ver abajo cómo]
Environments: Production ✅, Preview ✅
```

**Generar NEXTAUTH_SECRET**:

```bash
# Opción 1: Con OpenSSL (en tu terminal)
openssl rand -base64 32

# Opción 2: Online
# Ve a: https://generate-secret.vercel.app/32
```

#### 3. Google OAuth (Workspace)

```
Name: GOOGLE_CLIENT_ID
Value: [Tu Client ID de Google Cloud Console]
Environments: Production ✅, Preview ✅

Name: GOOGLE_CLIENT_SECRET
Value: [Tu Client Secret de Google Cloud Console]
Environments: Production ✅, Preview ✅
```

💡 **Dónde obtener**:

- Google Cloud Console: https://console.cloud.google.com/apis/credentials
- Proyecto: verifactu-business-480212
- Busca el OAuth 2.0 Client que usas para el admin panel

#### 4. Gmail API (Service Account - opcional si usas Gmail)

```
Name: GOOGLE_SERVICE_ACCOUNT_EMAIL
Value: api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com
Environments: Production ✅, Preview ✅

Name: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
Value: "-----BEGIN PRIVATE KEY-----\n[CLAVE]\n-----END PRIVATE KEY-----\n"
Environments: Production ✅, Preview ✅
```

---

## ✅ Checklist de Configuración

### Antes de Configurar

- [ ] Tengo la URL completa de Prisma Accelerate (no cortada)
- [ ] Tengo acceso al archivo `.env.local` local para copiar valores
- [ ] Tengo acceso a Vercel Dashboard

### Durante Configuración

- [ ] **verifactu-app**: DATABASE_URL configurada
- [ ] **verifactu-app**: FIREBASE*ADMIN*\* (3 variables) configuradas
- [ ] **verifactu-admin**: DATABASE_URL configurada
- [ ] **verifactu-admin**: NEXTAUTH\_\* (2 variables) configuradas
- [ ] **verifactu-admin**: GOOGLE*CLIENT*\* (2 variables) configuradas
- [ ] Todas las variables marcadas para "Production" y "Preview"
- [ ] Guardé los cambios en cada proyecto

### Después de Configurar

- [ ] Verificar que Vercel está desplegando (auto-deploy por push)
- [ ] O forzar redeploy manual
- [ ] Esperar a que builds completen (~5-10 min)
- [ ] Probar endpoints

---

## 🚀 Deployment

### Opción 1: Automático (Ya Activado)

Como ya hiciste push a `main`, Vercel debería estar desplegando automáticamente.

**Verifica el estado**:

1. Ve a: https://vercel.com/kiabusiness2025
2. Busca tus proyectos (verifactu-app, verifactu-admin)
3. Deberías ver "Building..." o "Ready"

Si ves errores en el build → Ve a los logs y verifica que las env vars estén correctas.

### Opción 2: Redeploy Manual

Si el auto-deploy falló o quieres forzar rebuild:

**Método 1: Vercel Dashboard**

1. Ve al proyecto → Deployments
2. Encuentra el último deployment
3. Click "..." → "Redeploy"
4. ❌ NO marques "Use existing Build Cache" (queremos rebuild con nuevas vars)
5. Click "Redeploy"

**Método 2: Vercel CLI**

```bash
# Instalar CLI (si no lo tienes)
npm install -g vercel

# Login
vercel login

# Deploy app
cd apps/app
vercel --prod

# Deploy admin
cd ../admin
vercel --prod
```

---

## 🧪 Testing Post-Deployment

### Test 1: Apps están live

```bash
# Verifica que responden
curl -I https://verifactu-app.vercel.app
curl -I https://verifactu-admin.vercel.app

# Expected: HTTP/2 200
```

### Test 2: Firebase Auth (necesitas token real)

```bash
# Después de login en tu app Firebase, obtén el token:
# const token = await firebase.auth().currentUser.getIdToken()

curl -H "Authorization: Bearer TU_TOKEN_FIREBASE" \
  https://verifactu-app.vercel.app/api/app/me

# Expected: {"user":{...},"companiesOwned":[...]}
```

### Test 3: Admin Panel Login

1. Ve a: https://verifactu-admin.vercel.app
2. Click "Sign in with Google"
3. Usa tu cuenta @verifactu.business
4. Deberías ver el dashboard

### Test 4: Verificar logs

```bash
# Ver logs en tiempo real
vercel logs verifactu-app --prod
vercel logs verifactu-admin --prod

# Buscar errores
vercel logs verifactu-app --prod | grep -i error
```

---

## 🔧 Troubleshooting

### ❌ Error: "Database connection failed"

**Causa**: URL de Prisma Accelerate incorrecta o cortada

**Solución**:

1. Ve a https://console.prisma.io/
2. Copia TODA la URL (debería ser larga)
3. Verifica que termina con el API key completo (no "...")
4. Actualiza en Vercel → Redeploy

### ❌ Error: "Firebase token verification failed"

**Causa**: Credenciales Firebase incorrectas

**Solución**:

1. Verifica `FIREBASE_ADMIN_PROJECT_ID`: debe ser `verifactu-business-480212`
2. Verifica `FIREBASE_ADMIN_PRIVATE_KEY`:
   - Debe empezar con `"-----BEGIN PRIVATE KEY-----\n`
   - Debe terminar con `\n-----END PRIVATE KEY-----\n"`
   - Los `\n` son LITERALES (no saltos de línea reales)
3. Copia exactamente desde tu `.env.local` local

### ❌ Error: "NEXTAUTH_SECRET is not set"

**Solución**:

```bash
# Genera uno nuevo
openssl rand -base64 32

# Añádelo a Vercel verifactu-admin
# Name: NEXTAUTH_SECRET
# Value: [el string generado]
# Redeploy
```

### ❌ Build exitoso pero functions fallan

**Solución**:

1. Revisa Vercel function logs: `vercel logs verifactu-app --prod`
2. Busca errores específicos
3. Usualmente es problema de env vars o Prisma Client no generado
4. Verifica que `package.json` tiene: `"prebuild": "prisma generate"`

---

## 📊 Monitoring Post-Deployment

### Prisma Accelerate Dashboard

**URL**: https://console.prisma.io/

**Qué verificar**:

- ✅ Connection status: "Active"
- ✅ Query latency: < 100ms (p95)
- ✅ Cache hit rate: > 70%
- ❌ Error rate: 0%

### Vercel Dashboard

**URL**: https://vercel.com/kiabusiness2025

**Qué verificar**:

- ✅ Deployment status: "Ready"
- ✅ Function execution: < 3s
- ❌ Function errors: 0%
- ✅ Build time: < 5min

---

## 🎯 Próximos Pasos Después del Deploy

### Inmediato (hoy)

1. ✅ Configura todas las env vars en Vercel
2. ✅ Verifica que deployments completan exitosamente
3. ✅ Prueba auth flows (Firebase + Google Workspace)
4. ✅ Verifica que datos se leen/escriben correctamente

### Corto plazo (esta semana)

5. 🔒 Limita IPs autorizadas en Cloud SQL (solo Vercel, no tu IP local)
6. 📊 Configura alertas de monitoreo
7. 💾 Habilita backups automáticos de Cloud SQL
8. 📝 Documenta URLs de producción para el equipo

### Mediano plazo (este mes)

9. 🔄 Migra datos existentes de Firestore (si aplica)
10. 🧪 Configura entorno de staging
11. 🤖 Configura CI/CD con tests automáticos
12. ⚡ Revisa optimización de performance

---

## 📚 Documentación Relacionada

- [SCENARIO_A_IMPLEMENTATION.md](./SCENARIO_A_IMPLEMENTATION.md) - Detalles de implementación
- [TESTING_AUTH_FLOWS.md](./TESTING_AUTH_FLOWS.md) - Escenarios de testing
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Guía completa de despliegue
- [CLOUD_SQL_SETUP.md](./CLOUD_SQL_SETUP.md) - Configuración de base de datos

---

## 💡 Tips Importantes

1. **Private Keys**: Siempre usa `\n` literal (no saltos de línea reales)
2. **API Keys**: Cópialos completos, suelen ser muy largos
3. **Environments**: Marca "Production" y "Preview", NO "Development"
4. **Testing**: Usa tokens reales de Firebase, no tokens de prueba
5. **Logs**: Revisa siempre los logs de Vercel si algo falla

---

**Estado**: 🟢 Listo para Configurar  
**Tiempo Estimado**: 15-20 minutos  
**Nivel de Dificultad**: Medio  
**Prerequisito**: Tener la URL completa de Prisma Accelerate

¿Necesitas ayuda configurando alguna variable específica? 🤝
