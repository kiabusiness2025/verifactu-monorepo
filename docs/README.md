# 📚 Documentación Verifactu Business

## 📋 Índice Rápido

### 🎯 Comenzar Aquí
- **[README.md](../README.md)** - Descripción general del proyecto
- **[ARQUITECTURA_UNIFICADA.md](../ARQUITECTURA_UNIFICADA.md)** - Arquitectura completa (Vercel + Firebase + Prisma)

### 🔐 Autenticación

**Setup/** (Configuración)
- [setup/FIREBASE_CONSOLE_ACCESO.md](setup/FIREBASE_CONSOLE_ACCESO.md) - Acceso Firebase Console
- [setup/FIREBASE_AUTH_SETUP.md](setup/FIREBASE_AUTH_SETUP.md) - Autenticación Firebase
- [setup/MULTI_TENANT_AUTH_SETUP.md](setup/MULTI_TENANT_AUTH_SETUP.md) - Multi-tenant setup

**Web/** (En raíz)
- [../FACEBOOK_OAUTH_SETUP.md](../FACEBOOK_OAUTH_SETUP.md) - Facebook OAuth
- [../SECURITY.md](../SECURITY.md) - Políticas de seguridad

### 🚀 Despliegue

**deployment/** (Guías de despliegue)
- [deployment/VERCEL_DEPLOYMENT_GUIDE.md](deployment/VERCEL_DEPLOYMENT_GUIDE.md) - Vercel
- [deployment/CLOUD_RUN_QUICK_REFERENCE.md](deployment/CLOUD_RUN_QUICK_REFERENCE.md) - Cloud Run
- [deployment/GITHUB_CLOUD_BUILD_SETUP.md](deployment/GITHUB_CLOUD_BUILD_SETUP.md) - CI/CD

**Web/** (En raíz)
- [../GOOGLE_CLOUD_RUN_IAM.md](../GOOGLE_CLOUD_RUN_IAM.md) - Permisos IAM (opcional)

### 📱 Flutter / Mobile

**setup/** (Instalación)
- [setup/FLUTTER_INSTALLATION_GUIDE.md](setup/FLUTTER_INSTALLATION_GUIDE.md) - Instalación Flutter
- [setup/FLUTTER_SETUP.md](setup/FLUTTER_SETUP.md) - Setup del proyecto

**Mobile** (Apps)
- [../apps/mobile/QUICK_START.md](../apps/mobile/QUICK_START.md) - Quick start

### 🗄️ Base de Datos

**setup/** (Configuración)
- [setup/DB_SETUP_GUIDE.md](setup/DB_SETUP_GUIDE.md) - PostgreSQL + Prisma
- **Schema:** [../apps/app/prisma/schema.prisma](../apps/app/prisma/schema.prisma)

### 🤖 AI / Genkit

**ai/** (Documentación de IA)
- [ai/ISAAK_V3_QUICK_START.md](ai/ISAAK_V3_QUICK_START.md) - Quick start Genkit
- [ai/ISAAK_V3_TESTING_GUIDE.md](ai/ISAAK_V3_TESTING_GUIDE.md) - Testing
- [ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md](ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md) - Checklist

### 📊 Estado del Proyecto

**Web/** (En raíz)
- [../PROJECT_STATUS.md](../PROJECT_STATUS.md) - Estado actual
- [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) - Estado de implementación
- [../DELIVERABLES.md](../DELIVERABLES.md) - Entregables

### 🎨 Branding

**Web/** (En raíz)
- [../BRANDING.md](../BRANDING.md) - Guía de branding
- [../MANIFESTO.md](../MANIFESTO.md) - Manifesto de la marca

### 📈 Optimización

**optimization/** (Performance y auditorías)
- [optimization/LANDING_OPTIMIZATION_STATUS.md](optimization/LANDING_OPTIMIZATION_STATUS.md) - Performance
- [optimization/ACCESSIBILITY_AUDIT.md](optimization/ACCESSIBILITY_AUDIT.md) - Accesibilidad
- [optimization/IMAGE_OPTIMIZATION_GUIDE.md](optimization/IMAGE_OPTIMIZATION_GUIDE.md) - Imágenes

### 🗂️ Archivos Legados

**legacy/** - Código y docs antiguos
- Early implementations
- Configuration files
- Deprecated guides

---

## 🗂️ Estructura del Proyecto

```
verifactu-monorepo/
├── apps/
│   ├── app/                    # Next.js - Aplicación principal
│   ├── landing/                # Next.js - Landing page
│   ├── api/                    # API backend
│   └── mobile/                 # Flutter - App móvil
├── packages/
│   ├── ui/                     # Componentes UI compartidos
│   ├── utils/                  # Utilidades compartidas
│   ├── eslint-config/          # Config ESLint
│   └── typescript-config/      # Config TypeScript
├── db/
│   ├── schema.sql              # Schema PostgreSQL
│   └── init-complete.sql       # Datos iniciales
├── docs/                       # Documentación
├── scripts/                    # Scripts de desarrollo
├── brand/                      # Assets de branding
└── ops/                        # Configuración operacional
```

---

## ⚡ Inicio Rápido

### Web (Next.js)

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev:app        # http://localhost:3000
pnpm dev:landing    # http://localhost:3001

# Build
pnpm build
```

### Mobile (Flutter)

```bash
cd apps/mobile

# Desarrollo
flutter run -d chrome

# Build APK (Android)
flutter build apk

# Build IPA (iOS)
flutter build ios
```

---

## 🔧 Tecnologías Principales

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Flutter** - Mobile app

### Backend
- **Firebase** - Auth, Firestore, Remote Config, Analytics
- **PostgreSQL** - Relational database
- **Prisma ORM** - Database ORM
- **Genkit AI** - AI features

### Deployment
- **Vercel** - Web hosting
- **Firebase** - Backend services
- **Google Cloud Run** - Optional API hosting

---

## 📞 Contacto

**Email:** kiabusiness2025@gmail.com

---

**Última actualización:** Enero 2026
