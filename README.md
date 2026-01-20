# 🏢 Verifactu Business - Monorepo

<div align="center">

**Plataforma SaaS completa para emisión de facturas y cumplimiento VeriFactu**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.38-02569B?logo=flutter)](https://flutter.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)](https://firebase.google.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Hosted-000000?logo=vercel)](https://vercel.com/)

[Documentación](./docs/README.md) • [Arquitectura](./ARQUITECTURA_UNIFICADA.md) • [Deliverables](./PROJECT_DELIVERABLES.md)

</div>

---

## 🎯 Descripción

**Verifactu Business** es una plataforma SaaS moderna para:

✅ **Emisión de facturas** - Crea y gestiona facturas de forma sencilla  
✅ **Cumplimiento VeriFactu** - Integración con Sistema de Notificación Inmediata (SNI)  
✅ **Multi-tenant** - Soporte para múltiples empresas por usuario  
✅ **Autenticación robusta** - Firebase Auth con Google, Microsoft, Facebook  
✅ **App móvil** - Flutter app con sincronización en tiempo real  
✅ **Analytics** - Google Tag Manager + Firebase Analytics  
✅ **AI** - Genkit para análisis de documentos y chatbot  

---

## 🚀 Stack Tecnológico

### Frontend
- **Next.js 14** - React framework con SSR
- **Flutter 3.38** - App móvil iOS/Android/Web
- **TypeScript** - Type safety en todo el código
- **Tailwind CSS** - Styling utility-first
- **Material Design 3** - Design system moderno

### Backend
- **Firebase** - Auth, Firestore, Remote Config, Analytics
- **PostgreSQL** - Base de datos relacional
- **Prisma ORM** - Query builder type-safe
- **Genkit AI** - AI flows con Google AI

### Deployment
- **Vercel** - Hosting web (Next.js apps)
- **Firebase Hosting** - Backend services
- **Google Cloud Run** - Optional API scaling
- **GitHub Actions** - CI/CD

---

## 📁 Estructura del Proyecto

```
verifactu-monorepo/
├── apps/
│   ├── app/                    # 🎯 App principal (Next.js)
│   │   ├── lib/                # Librerías (firebase, prisma, etc.)
│   │   ├── components/         # Componentes React
│   │   ├── hooks/              # Custom hooks
│   │   ├── app/                # App router (Next.js)
│   │   └── prisma/             # ORM schema
│   ├── landing/                # 🌐 Landing page (Next.js)
│   ├── api/                    # 📡 API backend (opcional)
│   └── mobile/                 # 📱 Flutter app
│       ├── lib/
│       ├── services/           # Auth, Invoice, RemoteConfig
│       ├── pages/              # UI pages
│       └── main.dart
├── packages/
│   ├── ui/                     # 🎨 Componentes compartidos
│   ├── utils/                  # Utilidades compartidas
│   ├── eslint-config/
│   └── typescript-config/
├── db/
│   ├── schema.sql              # PostgreSQL schema
│   └── init-complete.sql       # Datos iniciales
├── docs/                       # 📚 Documentación
├── scripts/                    # 🔧 Scripts de desarrollo
├── brand/                      # 🎨 Assets de branding
├── ops/                        # ⚙️ Configuración ops
└── vercel.json                 # Config Vercel
```

---

## ⚡ Inicio Rápido

### 1️⃣ Clonar Repositorio

```bash
git clone https://github.com/kiabusiness2025/verifactu-monorepo.git
cd verifactu-monorepo
```

### 2️⃣ Instalar Dependencias

```bash
# Usar pnpm (recomendado)
pnpm install

# O usar npm
npm install
```

### 3️⃣ Configurar Variables de Entorno

```bash
# apps/app/.env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=verifactu-business
DATABASE_URL=postgresql://...
GOOGLE_AI_API_KEY=...  # Para Genkit (opcional)

# apps/landing/.env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...
```

### 4️⃣ Ejecutar en Desarrollo

```bash
# Web app (puerto 3000)
pnpm dev:app

# Landing page (puerto 3001)
pnpm dev:landing

# Flutter app
cd apps/mobile && flutter run -d chrome
```

### 5️⃣ Build y Deploy

```bash
# Build
pnpm build

# Deploy a Vercel (automático con git push)
git push origin main
```

---

## 🔐 Autenticación

### Proveedores Soportados
- ✅ Email/Password
- ✅ Google OAuth
- ✅ Microsoft OAuth
- ✅ Facebook OAuth

### Flow de Autenticación
```
Usuario → Firebase Auth → Sync a Prisma → 
Auto-crear Tenant + Membership (owner) → 
Trial 14 días con plan Free
```

---

## 💾 Base de Datos

### Schema Prisma
```
Tenant → Memberships ← User
              ↓
          Subscriptions → Plans
          Invoices → Payments
```

### Modelos
- **Tenant** - Empresa/workspace del usuario
- **User** - Usuario Firebase
- **Membership** - Relación user-tenant con roles (owner, admin, member)
- **UserPreference** - Preferencias por usuario
- **Plan** - Planes de suscripción (free, pro, business)
- **Subscription** - Suscripción activa del tenant
- **Invoice** - Facturas
- **Payment** - Pagos de facturas

---

## 📱 App Móvil (Flutter)

### Características
- Autenticación Firebase
- Gestión de facturas con Firestore
- Feature flags con Remote Config
- Sincronización en tiempo real

### Comandos
```bash
cd apps/mobile

# Desarrollo
flutter run -d chrome

# Build APK (Android)
flutter build apk

# Build IPA (iOS)
flutter build ios

# Build web
flutter build web
```

---

## 🎨 UI/Components

- Componentes compartidos en `packages/ui/`
- Tailwind CSS + Material Design 3
- Dark mode soportado
- Responsive design

---

## 📚 Documentación

Ver [docs/README.md](./docs/README.md) para:

- 🏗️ [Arquitectura completa](./ARQUITECTURA_UNIFICADA.md)
- 🔐 [Autenticación y seguridad](./FIREBASE_CONSOLE_ACCESO.md)
- 🚀 [Guías de despliegue](./VERCEL_DEPLOYMENT_GUIDE.md)
- 📱 [Setup Flutter](./FLUTTER_SETUP.md)
- 🗄️ [Base de datos](./DB_SETUP_GUIDE.md)
- 🤖 [Genkit AI](./ISAAK_V3_QUICK_START.md)

---

## 🐛 Troubleshooting

### Error: `DATABASE_URL not set`
```bash
# Asegúrate de que exista en .env.local
echo "DATABASE_URL=..." >> apps/app/.env.local
```

### Error: Firebase credentials not found
```bash
# Verifica que las credenciales estén en lib/firebase.ts
# O configura variables en .env.local
```

### Flutter app no compila
```bash
cd apps/mobile
flutter clean
flutter pub get
flutter run -d chrome
```

---

## 🔗 Enlaces Útiles

- **Firebase Console:** https://console.firebase.google.com/project/verifactu-business
- **Vercel Dashboard:** https://vercel.com/kiabusiness2025/verifactu-monorepo
- **GitHub:** https://github.com/kiabusiness2025/verifactu-monorepo
- **Documentación Firebase:** https://firebase.google.com/docs
- **Documentación Next.js:** https://nextjs.org/docs
- **Documentación Flutter:** https://flutter.dev/docs

---

## 📞 Contacto

**Email:** kiabusiness2025@gmail.com

---

## 📄 Licencia

Proyecto privado - Verifactu Business 2026

---

**Última actualización:** Enero 2026


Cada “app” es un servicio independiente que se despliega por separado.

---------------------------------------------------------------------
🏗️ 3. Validación técnica del monorepo en GCP
---------------------------------------------------------------------

Antes de desplegar, validar que todo compila correctamente dentro del entorno Cloud Shell.

3.1 Landing
cd $REPO_DIR/apps/landing
npm ci
npm run build

3.2 App principal
cd $REPO_DIR/apps/app
npm ci
npm run lint
npm run build

3.3 API (Node + Express)
cd $REPO_DIR/apps/api
npm ci
npm test       # si jest está configurado
npm start      # test local


Si todo compila → se puede pasar a despliegues.

---------------------------------------------------------------------
🗄️ 4. Integración con Cloud SQL (Postgres)
NAME: verifactu-db
ENGINE: PostgreSQL 15
REGION: europe-west1
PUBLIC IP: 146.148.21.12

4.2 Variables de entorno para servicios

DATABASE_HOST=146.148.21.12
DATABASE_PORT=5432
DATABASE_USER=verifactu_user
DATABASE_PASSWORD=<<<SECRET>>>
DATABASE_NAME=verifactu_business
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE


Se almacenan en Secret Manager:

echo -n 'postgres://...' | gcloud secrets create DATABASE_URL --data-file=-


Dar acceso al servicio:

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member=serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

---------------------------------------------------------------------
🛠️ 5. Despliegue de servicios
---------------------------------------------------------------------

## 5.1 Landing - Vercel (Recomendado)

La landing se despliega automáticamente en **Vercel**:

1. Conectar el repositorio en vercel.com
2. Configuración automática:
   - Framework: Next.js (auto-detectado)
   - Root Directory: `apps/landing`
   - Build Command: `npm run build` (auto-detectado)
   - Output Directory: `.next`
3. Deploy automático en cada push a `main`

Alternativamente, desplegar localmente con Vercel CLI:
```bash
npm install -g vercel
vercel --prod
Configurar en Vercel (Production y Preview):
- `ISAAC_API_KEY` (preferido) o `NEXT_PUBLIC_ISAAC_API_KEY`
- `ISAAC_ASSISTANT_ID` (opcional) o `NEXT_PUBLIC_ISAAC_ASSISTANT_ID`
```

Variables de entorno Isaak (requeridas):

Vercel (Production y Preview):
- ISAAK_API_KEY=tu_clave (preferido)
- ISAAK_ASSISTANT_ID=tu_asistente (opcional)
- NEXT_PUBLIC_ISAAK_API_KEY=tu_clave (solo si prefieres exponerla en cliente)
- NEXT_PUBLIC_ISAAK_ASSISTANT_ID=tu_asistente

Desarrollo local en apps/landing/.env.local:
```env
ISAAK_API_KEY=tu_clave
ISAAK_ASSISTANT_ID=tu_asistente
# Compatibilidad pública si prefieres usar NEXT_PUBLIC
NEXT_PUBLIC_ISAAK_API_KEY=tu_clave
NEXT_PUBLIC_ISAAK_ASSISTANT_ID=tu_asistente
```

Luego:
```bash
cd apps/landing
npm run dev
```

cd $REPO_DIR/apps/app

  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest

## 5.3 API (Node Express) - Cloud Run

cd $REPO_DIR/apps/api

gcloud run deploy verifactu-api \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest

---------------------------------------------------------------------
🔐 6. Secret Manager estándar del proyecto
---------------------------------------------------------------------

Variables típicas:

DATABASE_URL
JWT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
AEAT_CERTIFICATE_P12
AEAT_CERTIFICATE_PASSWORD


Crear un secreto:

echo -n "VALUE" | gcloud secrets create SECRET_NAME --data-file=-


Actualizar:

echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

---------------------------------------------------------------------
🔄 7. Pipeline recomendado (Cloud Build YAML)
---------------------------------------------------------------------

Ejemplo minimal:

steps:
  - name: "node:20"
    entrypoint: bash
    args:
      - -c
      - |
        cd apps/app
        npm ci
        npm run build

  - name: "gcr.io/cloud-builders/gcloud"
    args:
      [
        "run", "deploy", "verifactu-app",
        "--source=apps/app",
        "--region=europe-west1",
        "--allow-unauthenticated"
      ]

images: []

---------------------------------------------------------------------
🧩 8. Migración desde entornos previos
---------------------------------------------------------------------
✔ Recomendado:

Clonar repositorio limpio en el nuevo proyecto.

Validar builds en Cloud Shell.

Configurar secretos en Secret Manager.

Conectar con Cloud SQL (no crear tablas aún).

Implementar migrador ORM (Prisma recomendado).

Desplegar servicios uno por uno.

Verificar rutas, dominios y CORS.

---------------------------------------------------------------------
🧹 9. Mantenimiento del entorno Cloud Shell
---------------------------------------------------------------------

Para liberar espacio:

docker system prune -af
rm -rf ~/.npm
rm -rf ~/.cache
find $HOME -type d -name "node_modules" -prune -exec rm -rf {} +


Comprobar:

df -h $HOME

---------------------------------------------------------------------
✅ 10. Estado ideal antes de comenzar desarrollo
---------------------------------------------------------------------

El entorno está correctamente configurado cuando:

✔ node y npm funcionan
✔ el monorepo compila (landing, app, api)
✔ Cloud SQL responde a nivel de variables
✔ Secret Manager tiene los secretos clave
✔ Se puede desplegar un servicio simple a Cloud Run
✔ Los dominios están activos en Cloud Run / DNS
#   T e s t  
 